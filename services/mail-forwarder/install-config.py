"""Install only the dedicated forwarding credential over SSH stdin. Never print secrets."""
import json
import os
import pathlib
import re
import sys
import urllib.request

ENDPOINT = "https://prisma.hrtsolutions.com.br/webhooks/resend-inbound"
EVENTS = ["email.received", "email.delivered", "email.bounced", "email.failed", "email.complained"]
CONFIG = pathlib.Path("/etc/prisma/hrt-mail-forwarder.json")
STAGE = "host"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def install():
    global STAGE
    if os.uname().nodename != "srv1038882":
        raise ValueError("unexpected_host")
    key = sys.stdin.read().strip()
    if not re.fullmatch(r"re_[A-Za-z0-9_-]+", key):
        raise ValueError("invalid_credential")
    os.umask(0o077)
    if CONFIG.exists():
        if CONFIG.is_symlink() or json.loads(CONFIG.read_text()).get("apiKey") != key:
            raise ValueError("configuration_conflict")
        print("PROTECTED_CONFIGURATION_ALREADY_INSTALLED")
        return
    opener = urllib.request.build_opener(NoRedirect())

    def call(path, body=None):
        global STAGE
        STAGE = "receiving_permission" if path.startswith("/emails/") else "webhook_create" if body is not None else "webhook_read"
        request = urllib.request.Request(
            "https://api.resend.com" + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "HRT-mail-setup/1.0"},
            method="POST" if body is not None else "GET",
        )
        with opener.open(request, timeout=30) as response:
            return json.load(response)

    # Permission proof without downloading an email body or sending anything.
    call("/emails/receiving?limit=1")
    matches = [item for item in call("/webhooks").get("data", []) if item.get("endpoint") == ENDPOINT]
    if len(matches) > 1:
        raise ValueError("duplicate_webhooks")
    if matches:
        hook = call("/webhooks/" + matches[0]["id"])
        if set(hook.get("events", [])) != set(EVENTS):
            raise ValueError("webhook_conflict")
    else:
        hook = call("/webhooks", {"endpoint": ENDPOINT, "events": EVENTS})
    secret = hook.get("signing_secret", "")
    if not secret.startswith("whsec_"):
        raise ValueError("signing_secret_missing")
    STAGE = "protected_write"
    pending = CONFIG.with_suffix(".pending")
    fd = os.open(str(pending), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o400)
    with os.fdopen(fd, "w") as stream:
        json.dump({"apiKey": key, "webhookSecret": secret, "webhookId": hook["id"]}, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.chown(pending, 1000, 1000)
    os.replace(pending, CONFIG)
    print(json.dumps({"installed": True, "webhookId": hook["id"], "bodyDownloaded": False, "emailSent": False}))


if __name__ == "__main__":
    try:
        install()
    except Exception as error:
        print(json.dumps({"installed": False, "stage": STAGE, "category": type(error).__name__, "httpStatus": getattr(error, "code", None)}))
        sys.exit(1)

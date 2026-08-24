import { useDeferredValue, useEffect, useState } from "react";
import { ArrowRightOutlined, SearchOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Input, Select, Skeleton, Tag } from "antd";
import {
  PERSON_LIFECYCLES,
  describeLifecycle,
  type PeopleQuery,
  type PersonListItem,
  type PrismaDataRepository,
} from "../domain/prismaData";
import type { OrganizationMembership } from "../shared/access";
import { PrismaCard } from "../ui/PrismaCard";
import { PrismaPage, PrismaPageHeader } from "../ui/PrismaPage";

interface PeoplePageProps {
  activeMembership: OrganizationMembership;
  repository: PrismaDataRepository;
  onNavigate: (path: string) => void;
}

const initialQuery: PeopleQuery = { search: "", lifecycle: "all" };

export function PeoplePage({ activeMembership, repository, onNavigate }: PeoplePageProps) {
  const [query, setQuery] = useState(initialQuery);
  const deferredSearch = useDeferredValue(query.search);
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setPeople([]);
    setLoading(true);
    setError(null);
    void repository.listPeople(activeMembership.organizationId, { ...query, search: deferredSearch })
      .then((result) => {
        if (current) setPeople(result);
      })
      .catch(() => {
        if (current) setError("Não foi possível consultar Pessoas no Supabase.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [activeMembership.organizationId, deferredSearch, query.lifecycle, repository]);

  return (
    <PrismaPage>
      <PrismaPageHeader
        title="Pessoas"
        description={`Consulta profissional restrita à organização ${activeMembership.organizationName}.`}
      />
      <PrismaCard className="prisma-people-toolbar">
        <Input
          allowClear
          aria-label="Buscar pessoa por nome"
          onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value }))}
          placeholder="Buscar por nome"
          prefix={<SearchOutlined />}
          value={query.search}
        />
        <Select
          aria-label="Filtrar por vínculo"
          onChange={(lifecycle: PeopleQuery["lifecycle"]) => setQuery((current) => ({ ...current, lifecycle }))}
          options={[
            { label: "Todos os vínculos", value: "all" },
            ...PERSON_LIFECYCLES.map((lifecycle) => ({ label: describeLifecycle(lifecycle), value: lifecycle })),
          ]}
          value={query.lifecycle}
        />
      </PrismaCard>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <PrismaCard className="prisma-people-card">
        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : people.length > 0 ? (
          <div className="prisma-people-list" role="list">
            {people.map((person) => (
              <article className="prisma-person-row" key={person.id} role="listitem">
                <div className="prisma-person-avatar" aria-hidden="true">{initials(person.fullName)}</div>
                <div className="prisma-person-copy">
                  <strong>{person.fullName}</strong>
                  <span>
                    <Tag color="blue">{describeLifecycle(person.lifecycle)}</Tag>
                    <Tag color={person.hasStructuredProfile ? "green" : "default"}>
                      {person.hasStructuredProfile ? "Perfil estruturado" : "Sem perfil estruturado"}
                    </Tag>
                  </span>
                </div>
                <Button icon={<ArrowRightOutlined />} onClick={() => onNavigate(`/profiles/${person.id}`)}>
                  Ver perfil
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            description={query.search || query.lifecycle !== "all"
              ? "Nenhuma pessoa corresponde à busca e aos filtros."
              : "Nenhuma pessoa cadastrada nesta organização."}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </PrismaCard>
    </PrismaPage>
  );
}

function initials(fullName: string): string {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

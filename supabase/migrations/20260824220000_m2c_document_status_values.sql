-- Forward-only compatibility patch for the already-applied M2-C schema in Prisma-QA.
alter type public.document_status add value if not exists 'received';
alter type public.document_status add value if not exists 'ready_for_review';
alter type public.document_status add value if not exists 'in_review';
alter type public.document_status add value if not exists 'approved';
alter type public.document_status add value if not exists 'failed';

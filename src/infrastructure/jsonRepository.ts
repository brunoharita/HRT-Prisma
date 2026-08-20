import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  Evidence,
  Inference,
  MatchEvaluation,
  PersistedData,
  Person,
  ProcessingEvent,
  ProfessionalProfile,
  ResumeDocument,
} from "../domain/types.js";
import type { TalentRepository } from "./repository.js";

function emptyData(): PersistedData {
  return {
    people: [],
    documents: [],
    profiles: [],
    evidence: [],
    inferences: [],
    matches: [],
    processingEvents: [],
  };
}

function replaceById<T extends { id: string }>(items: T[], next: T): T[] {
  return [...items.filter((item) => item.id !== next.id), next];
}

export class JsonTalentRepository implements TalentRepository {
  public constructor(public readonly filePath: string) {}

  private async read(): Promise<PersistedData> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as PersistedData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyData();
      throw error;
    }
  }

  private async write(data: PersistedData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporaryPath, this.filePath);
  }

  public async saveDocument(document: ResumeDocument): Promise<void> {
    const data = await this.read();
    data.documents = replaceById(data.documents, document);
    await this.write(data);
  }

  public async saveProcessingResult(input: {
    person: Person;
    document: ResumeDocument;
    profile: ProfessionalProfile;
    evidence: Evidence[];
    inferences: Inference[];
  }): Promise<void> {
    const data = await this.read();
    data.people = replaceById(data.people, input.person);
    data.documents = replaceById(data.documents, input.document);
    data.profiles = replaceById(data.profiles, input.profile);
    data.evidence = [...data.evidence.filter((item) => item.personId !== input.person.id), ...input.evidence];
    data.inferences = [...data.inferences.filter((item) => item.personId !== input.person.id), ...input.inferences];
    await this.write(data);
  }

  public async saveMatch(match: MatchEvaluation): Promise<void> {
    const data = await this.read();
    data.matches = replaceById(data.matches, match);
    await this.write(data);
  }

  public async appendProcessingEvent(event: ProcessingEvent): Promise<void> {
    const data = await this.read();
    data.processingEvents.push(event);
    await this.write(data);
  }

  public async listProfiles(organizationId: string): Promise<ProfessionalProfile[]> {
    const data = await this.read();
    return data.profiles.filter((item) => item.organizationId === organizationId);
  }

  public async listEvidence(organizationId: string): Promise<Evidence[]> {
    const data = await this.read();
    return data.evidence.filter((item) => item.organizationId === organizationId);
  }

  public async listInferences(organizationId: string): Promise<Inference[]> {
    const data = await this.read();
    return data.inferences.filter((item) => item.organizationId === organizationId);
  }

  public async snapshot(organizationId: string): Promise<PersistedData> {
    const data = await this.read();
    return {
      people: data.people.filter((item) => item.organizationId === organizationId),
      documents: data.documents.filter((item) => item.organizationId === organizationId),
      profiles: data.profiles.filter((item) => item.organizationId === organizationId),
      evidence: data.evidence.filter((item) => item.organizationId === organizationId),
      inferences: data.inferences.filter((item) => item.organizationId === organizationId),
      matches: data.matches.filter((item) => item.organizationId === organizationId),
      processingEvents: data.processingEvents.filter((item) => item.organizationId === organizationId),
    };
  }
}

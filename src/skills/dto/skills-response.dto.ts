import { Skill } from '../entities/skill.entity';

export class SkillsResponse {
  data: Skill[];
  page: number;
  totalPages: number;
}

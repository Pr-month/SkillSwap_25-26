import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { GetSkillsDto } from './dto/get-skills.dto';
import { SkillsResponse } from './dto/skills-response.dto';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  create(@Body() createSkillDto: CreateSkillDto) {
    return this.skillsService.create(createSkillDto);
  }

  @Get()
  async getSkills(@Query() query: GetSkillsDto): Promise<SkillsResponse> {
    const { page, limit, search, category } = query;
    const [skills, total] = await this.skillsService.getSkills(
      page,
      limit,
      search,
      category,
    );

    const totalPages = Math.ceil(total / limit);

    if (page > totalPages) {
      throw new NotFoundException('Страница не найдена');
    }

    return {
      data: skills,
      page,
      totalPages,
    };
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skillsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkillDto: UpdateSkillDto) {
    return this.skillsService.update(+id, updateSkillDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skillsService.remove(+id);
  }
}

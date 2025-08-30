import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  findAll(): Promise<Student[]> {
    return this.studentRepository.find({
      relations: ['user'],
    });
  }

  findOne(id: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  findByUserId(userId: number): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }
}

import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { CompetitorStatus } from '../common/enums/competitor-status.enum';
import { CompetitorType } from '../common/enums/competitor-type.enum';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { Competitor } from './entities/competitor.entity';
import { CompetitorsService } from './competitors.service';

const createDto: CreateCompetitorDto = {
  name: 'Borin Stonehelm',
  nickname: 'Stonebolt',
  type: CompetitorType.DWARF,
  dateOfBirth: '1994-06-12',
  weight: 78.5,
  height: 132.4,
  origin: 'Iron Hills',
  status: CompetitorStatus.ACTIVE,
};

function createCompetitor(overrides: Partial<Competitor> = {}): Competitor {
  return {
    id: 'c8207ad5-caca-4f67-9890-08ca7c999abb',
    ...createDto,
    registeredAt: new Date('2026-07-26T10:00:00.000Z'),
    updatedAt: new Date('2026-07-26T10:00:00.000Z'),
    ...overrides,
  };
}

describe('CompetitorsService', () => {
  let repository: jest.Mocked<
    Pick<
      Repository<Competitor>,
      'create' | 'save' | 'findOne' | 'merge' | 'remove'
    >
  >;
  let service: CompetitorsService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
    };
    service = new CompetitorsService(
      repository as unknown as Repository<Competitor>,
    );
  });

  it('creates and persists a valid competitor', async () => {
    const competitor = createCompetitor();
    repository.create.mockReturnValue(competitor);
    repository.save.mockResolvedValue(competitor);

    await expect(service.create(createDto)).resolves.toBe(competitor);
    expect(repository.create).toHaveBeenCalledWith(createDto);
    expect(repository.save).toHaveBeenCalledWith(competitor);
  });

  it('maps a duplicated nickname to a conflict', async () => {
    const competitor = createCompetitor();
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
    });
    repository.create.mockReturnValue(competitor);
    repository.save.mockRejectedValue(
      new QueryFailedError('INSERT', [], driverError),
    );

    await expect(service.create(createDto)).rejects.toThrow(ConflictException);
  });

  it('returns not found for an unknown competitor', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(crypto.randomUUID())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('allows a documented status transition', async () => {
    const competitor = createCompetitor();
    repository.findOne.mockResolvedValue(competitor);
    repository.save.mockImplementation((value) => Promise.resolve(value));

    const updated = await service.updateStatus(
      competitor.id,
      CompetitorStatus.SUSPENDED,
    );

    expect(updated.status).toBe(CompetitorStatus.SUSPENDED);
    expect(repository.save).toHaveBeenCalledWith(competitor);
  });

  it('rejects transitions from the terminal retired status', async () => {
    const competitor = createCompetitor({
      status: CompetitorStatus.RETIRED,
    });
    repository.findOne.mockResolvedValue(competitor);

    await expect(
      service.updateStatus(competitor.id, CompetitorStatus.ACTIVE),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

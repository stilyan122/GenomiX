using GenomiX.Core.Models;
using GenomiX.Core.ServiceHelpers;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Assert = NUnit.Framework.Assert;

namespace GenomiX.Tests.Services
{
    [TestFixture]
    public class SimulationServiceTests
    {
        private static SimFactors Factors(int tick = 0, bool running = false) => new SimFactors
        {
            Temperature = 22,
            Radiation = 0,
            DiseasePressure = 0,
            Resources = 1,
            Speed = 1,
            Tick = tick,
            IsRunning = running
        };

        [Test]
        public async Task GetAllForUserAsync_FiltersAndOrdersDesc_IncludesOrganismsAndBaseModel()
        {
            using var db = TestDbFactory.CreateDb();
            var pops = new EfTestRepository<Population>(db);
            var orgs = new EfTestRepository<Organism>(db);
            var sut = new SimulationService(pops, orgs);

            var u1 = Guid.NewGuid();
            var u2 = Guid.NewGuid();

            var baseModel = new DNAModel { Id = Guid.NewGuid(), UserId = u1, Name = "BM" };

            var pOld = new Population
            {
                Id = Guid.NewGuid(),
                UserId = u1,
                Name = "Old",
                BaseModelId = baseModel.Id,
                BaseModel = baseModel,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            pOld.Organisms.Add(new Organism { Id = Guid.NewGuid(), PopulationId = pOld.Id, Status = "alive" });

            var pNew = new Population
            {
                Id = Guid.NewGuid(),
                UserId = u1,
                Name = "New",
                BaseModelId = baseModel.Id,
                BaseModel = baseModel,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            pNew.Organisms.Add(new Organism { Id = Guid.NewGuid(), PopulationId = pNew.Id, Status = "alive" });

            var other = new Population
            {
                Id = Guid.NewGuid(),
                UserId = u2,
                Name = "Other",
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };

            db.DNA_Models.Add(baseModel);
            db.Populations.AddRange(pOld, pNew, other);
            await db.SaveChangesAsync();

            var list = await sut.GetAllForUserAsync(u1);

            Assert.That(list.Count, Is.EqualTo(2));
            Assert.That(list[0].Id, Is.EqualTo(pNew.Id));
            Assert.That(list[1].Id, Is.EqualTo(pOld.Id));

            Assert.That(list[0].Organisms, Is.Not.Null);
            Assert.That(list[0].Organisms.Count, Is.EqualTo(1));
            Assert.That(list[0].BaseModel, Is.Not.Null);
        }

        [Test]
        public async Task GetForUserAsync_ReturnsNull_WhenNotOwned()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var u1 = Guid.NewGuid();
            var u2 = Guid.NewGuid();

            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = u1,
                Name = "X",
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.GetForUserAsync(u2, pop.Id);
            Assert.That(res, Is.Null);
        }

        [Test]
        public async Task CreateAsync_TrimsName_CreatesNOrganisms_AndSetsNames()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var baseModelId = Guid.NewGuid();

            var popId = await sut.CreateAsync(userId, "   Arctic Run   ", baseModelId, 3, "mouse", Factors());

            var pop = await db.Populations.Include(p => p.Organisms).FirstAsync(p => p.Id == popId);

            Assert.That(pop.Name, Is.EqualTo("Arctic Run"));
            Assert.That(pop.Organisms.Count, Is.EqualTo(3));
            Assert.That(pop.Organisms.All(o => o.Type == "mouse"), Is.True);

            Assert.That(pop.Organisms.ToList()[0].SimpleName, Is.EqualTo("Mouse 1"));
            Assert.That(pop.Organisms.ToList()[0].ScientificName, Is.EqualTo("GX-MOUSE-0001"));
            Assert.That(pop.Organisms.ToList()[0].DNA_Model_Id, Is.EqualTo(baseModelId));
        }

        [Test]
        public async Task CreateAsync_MixedSpecies_CyclesThrough6()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var popId = await sut.CreateAsync(Guid.NewGuid(), "Run", Guid.NewGuid(), 8, "mixed", Factors());

            var pop = await db.Populations.Include(p => p.Organisms).FirstAsync(p => p.Id == popId);
            var types = pop.Organisms.Select(o => o.Type).ToList();

            Assert.That(types[0], Is.EqualTo("mouse"));
            Assert.That(types[1], Is.EqualTo("pig"));
            Assert.That(types[2], Is.EqualTo("cow"));
            Assert.That(types[3], Is.EqualTo("rabbit"));
            Assert.That(types[4], Is.EqualTo("fox"));
            Assert.That(types[5], Is.EqualTo("bird"));
            Assert.That(types[6], Is.EqualTo("mouse"));
            Assert.That(types[7], Is.EqualTo("pig"));
        }

        [Test]
        public void UpdateFactorsAsync_Throws_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.UpdateFactorsAsync(Guid.NewGuid(), Guid.NewGuid(), Factors())
            );
        }

        [Test]
        public async Task UpdateFactorsAsync_PreservesTickAndIsRunning()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 42, running: true))
            };
            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var nf = Factors(tick: 0, running: false);
            nf.Temperature = 0;
            nf.Radiation = 1;

            await sut.UpdateFactorsAsync(userId, pop.Id, nf);

            var saved = await db.Populations.FirstAsync(p => p.Id == pop.Id);
            var f = SimFactorsJsonHelper.Read(saved.Factors);

            Assert.That(f.Tick, Is.EqualTo(42));
            Assert.That(f.IsRunning, Is.True);
            Assert.That(f.Temperature, Is.EqualTo(0));
            Assert.That(f.Radiation, Is.EqualTo(1));
        }

        [Test]
        public async Task SetRunningAsync_UpdatesOnlyIsRunning()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 5, running: false))
            };
            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            await sut.SetRunningAsync(userId, pop.Id, true);

            var saved = await db.Populations.FirstAsync(p => p.Id == pop.Id);
            var f = SimFactorsJsonHelper.Read(saved.Factors);

            Assert.That(f.IsRunning, Is.True);
            Assert.That(f.Tick, Is.EqualTo(5));
        }

        [Test]
        public async Task TickAsync_IncrementsTick_AndClampsPositions_AndReturnsCountsConsistent()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 10, running: false))
            };

            for (int i = 0; i < 30; i++)
            {
                pop.Organisms.Add(new Organism
                {
                    Id = Guid.NewGuid(),
                    PopulationId = pop.Id,
                    CreatedAt = DateTimeOffset.UtcNow,
                    Status = "alive",
                    SurvivalScore = 1.0,
                    Fitness = 1.0,
                    X = 0.5f,
                    Y = 0.5f
                });
            }

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.TickAsync(userId, pop.Id, steps: 3);

            Assert.That(res.Tick, Is.EqualTo(13)); 
            Assert.That(res.Organisms.Count, Is.EqualTo(30));

            Assert.That(res.Alive + res.Dead + res.Reproduced, Is.EqualTo(30));

            Assert.That(res.AvgFitness, Is.GreaterThanOrEqualTo(0));
            Assert.That(res.AvgFitness, Is.LessThanOrEqualTo(1));

            Assert.That(res.Organisms.All(o => o.X >= 0 && o.X <= 1), Is.True);
            Assert.That(res.Organisms.All(o => o.Y >= 0 && o.Y <= 1), Is.True);

            var saved = await db.Populations.FirstAsync(p => p.Id == pop.Id);
            var f = SimFactorsJsonHelper.Read(saved.Factors);
            Assert.That(f.Tick, Is.EqualTo(13));
        }

        [Test]
        public void RenameAsync_Throws_WhenEmptyAfterTrim()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Old",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            db.Populations.Add(pop);
            db.SaveChanges();

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RenameAsync(userId, pop.Id, "   ")
            );
        }

        [Test]
        public async Task DeleteForUserAsync_DeletesPopulationAndItsOrganisms()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            db.Populations.Add(pop);

            db.Organisms.AddRange(
                new Organism { Id = Guid.NewGuid(), PopulationId = pop.Id, Status = "alive" },
                new Organism { Id = Guid.NewGuid(), PopulationId = pop.Id, Status = "alive" }
            );

            await db.SaveChangesAsync();

            await sut.DeleteForUserAsync(userId, pop.Id);

            Assert.That(await db.Organisms.CountAsync(), Is.EqualTo(0));
            Assert.That(await db.Populations.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task GetForUserAsync_ReturnsPopulation_WhenOwned_IncludesOrganismsAndBaseModel()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var baseModel = new DNAModel { Id = Guid.NewGuid(), UserId = userId, Name = "BM" };

            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Pop",
                BaseModelId = baseModel.Id,
                BaseModel = baseModel,
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };

            pop.Organisms.Add(new Organism { Id = Guid.NewGuid(), PopulationId = pop.Id, Status = "alive" });

            db.DNA_Models.Add(baseModel);
            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.GetForUserAsync(userId, pop.Id);

            Assert.That(res, Is.Not.Null);
            Assert.That(res!.BaseModel, Is.Not.Null);
            Assert.That(res.Organisms, Is.Not.Null);
            Assert.That(res.Organisms.Count, Is.EqualTo(1));
        }

        [Test]
        public void SetRunningAsync_Throws_WhenNotFoundOrNotOwned()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.SetRunningAsync(Guid.NewGuid(), Guid.NewGuid(), true)
            );
        }

        [Test]
        public void TickAsync_Throws_WhenPopulationNotFoundOrNotOwned()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.TickAsync(Guid.NewGuid(), Guid.NewGuid(), steps: 1)
            );
        }

        [Test]
        public async Task TickAsync_WithStepsZero_StillAdvancesBy1()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 7, running: false))
            };

            pop.Organisms.Add(new Organism
            {
                Id = Guid.NewGuid(),
                PopulationId = pop.Id,
                CreatedAt = DateTimeOffset.UtcNow,
                Status = "alive",
                SurvivalScore = 1.0,
                Fitness = 1.0,
                X = 0.5f,
                Y = 0.5f
            });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.TickAsync(userId, pop.Id, steps: 0);

            Assert.That(res.Tick, Is.EqualTo(8)); // Math.Max(1, 0) => 1 step
        }

        [Test]
        public async Task TickAsync_SkipsAlreadyDeadOrganisms_DoesNotChangeTheirStatus()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 0, running: false))
            };

            var deadId = Guid.NewGuid();
            pop.Organisms.Add(new Organism
            {
                Id = deadId,
                PopulationId = pop.Id,
                CreatedAt = DateTimeOffset.UtcNow,
                Status = "dead",
                SurvivalScore = 0,
                Fitness = 0,
                X = 0.2f,
                Y = 0.3f
            });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.TickAsync(userId, pop.Id, steps: 2);

            var org = res.Organisms.First(o => o.Id == deadId);
            Assert.That(org.Status, Is.EqualTo("dead"));
        }

        [Test]
        public async Task RenameAsync_UpdatesName_WhenValid()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Old",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            await sut.RenameAsync(userId, pop.Id, "   New Name   ");

            var saved = await db.Populations.FirstAsync(p => p.Id == pop.Id);
            Assert.That(saved.Name, Is.EqualTo("New Name"));
        }

        [Test]
        public void RenameAsync_Throws_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RenameAsync(Guid.NewGuid(), Guid.NewGuid(), "X")
            );
        }

        [Test]
        public void DeleteForUserAsync_Throws_WhenNotFoundOrNotOwned()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.DeleteForUserAsync(Guid.NewGuid(), Guid.NewGuid())
            );
        }

        [Test]
        public async Task CreateAsync_AllowsSizeZero_CreatesPopulationWithNoOrganisms()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var baseModelId = Guid.NewGuid();

            var popId = await sut.CreateAsync(userId, "  Zero  ", baseModelId, 0, "mouse", Factors());

            var pop = await db.Populations.Include(p => p.Organisms).FirstAsync(p => p.Id == popId);
            Assert.That(pop.Name, Is.EqualTo("Zero"));
            Assert.That(pop.Organisms.Count, Is.EqualTo(0));
        }

        [Test]
        public void RenameAsync_Throws_WhenPopulationNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.RenameAsync(Guid.NewGuid(), Guid.NewGuid(), "New")
            );
        }

        [Test]
        public void DeleteForUserAsync_Throws_WhenPopulationNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await sut.DeleteForUserAsync(Guid.NewGuid(), Guid.NewGuid())
            );
        }

        [Test]
        public async Task TickAsync_StepsNegative_StillRunsExactlyOneStep()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 100, running: false))
            };

            pop.Organisms.Add(new Organism
            {
                Id = Guid.NewGuid(),
                PopulationId = pop.Id,
                CreatedAt = DateTimeOffset.UtcNow,
                Status = "alive",
                SurvivalScore = 1.0,
                Fitness = 1.0,
                X = 0.5f,
                Y = 0.5f
            });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.TickAsync(userId, pop.Id, steps: -999);

            // Math.Max(1, steps) => 1 step
            Assert.That(res.Tick, Is.EqualTo(101));
        }

        [Test]
        public async Task TickAsync_SkipsDeadOrganism_BranchIsCovered()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Run",
                BaseModelId = Guid.NewGuid(),
                CreatedAt = DateTimeOffset.UtcNow,
                Factors = SimFactorsJsonHelper.Write(Factors(tick: 0, running: false))
            };

            var deadId = Guid.NewGuid();
            pop.Organisms.Add(new Organism
            {
                Id = deadId,
                PopulationId = pop.Id,
                CreatedAt = DateTimeOffset.UtcNow,
                Status = "dead",
                SurvivalScore = 0,
                Fitness = 0,
                X = 0.1f,
                Y = 0.2f
            });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var res = await sut.TickAsync(userId, pop.Id, steps: 1);

            var dto = res.Organisms.First(x => x.Id == deadId);
            Assert.That(dto.Status, Is.EqualTo("dead"));
        }

        [Test]
        public async Task CreateAsync_NonMixedSpecies_UsesProvidedSpecies()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var popId = await sut.CreateAsync(Guid.NewGuid(), "Run", Guid.NewGuid(), 2, "fox", Factors());

            var pop = await db.Populations.Include(p => p.Organisms).FirstAsync(p => p.Id == popId);
            Assert.That(pop.Organisms.All(o => o.Type == "fox"), Is.True);
        }

        [Test]
        public async Task CreateAsync_SizeZero_CreatesNoOrganisms()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var popId = await sut.CreateAsync(Guid.NewGuid(), "Zero", Guid.NewGuid(), 0, "mouse", Factors());

            var pop = await db.Populations.Include(p => p.Organisms).FirstAsync(p => p.Id == popId);
            Assert.That(pop.Organisms.Count, Is.EqualTo(0));
        }
    } 
}    
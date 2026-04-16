using GenomiX.Core.Models;
using GenomiX.Core.ServiceHelpers;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using GenomiX.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using MockQueryable.Moq;
using Moq;
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
        public async Task CreateAsync_WhenSpeciesIsMixed_AssignsCorrectSpeciesCycling()
        {
            var mockPops = new Mock<IRepository<Population>>();
            var mockOrgs = new Mock<IRepository<Organism>>();
            var sut = new SimulationService(mockPops.Object, mockOrgs.Object);

            await sut.CreateAsync(Guid.NewGuid(), "Test", Guid.NewGuid(), 7, "mixed", new SimFactors());

            mockPops.Verify(m => m.AddAsync(It.Is<Population>(p =>
                p.Organisms.Count == 7 &&
                p.Organisms.Any(o => o.Type == "mouse") && 
                p.Organisms.Any(o => o.Type == "bird") && 
                p.Organisms.Last().Type == "mouse"       
            )), Times.Once);
        }


     
        [Test]
        public void RenameAsync_WhenNameIsEmpty_ThrowsInvalidOperationException()
        {
            var popId = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var pop = new Population { Id = popId, UserId = userId };

            var mockPops = new Mock<IRepository<Population>>();
            mockPops.Setup(m => m.GetAll()).Returns(new[] { pop }.AsQueryable().BuildMock());

            var sut = new SimulationService(mockPops.Object, new Mock<IRepository<Organism>>().Object);
            var ex = Assert.ThrowsAsync<InvalidOperationException>(() => sut.RenameAsync(userId, popId, "   "));
            Assert.That(ex.Message, Is.EqualTo("Name is required."));
        }

        [Test]
        public void DeleteForUserAsync_WhenPopulationNotOwnedByUser_ThrowsException()
        {
            var popId = Guid.NewGuid();
            var wrongUserId = Guid.NewGuid();
            var mockPops = new Mock<IRepository<Population>>();
            mockPops.Setup(m => m.GetAll()).Returns(Enumerable.Empty<Population>().AsQueryable().BuildMock());

            var sut = new SimulationService(mockPops.Object, new Mock<IRepository<Organism>>().Object);

            Assert.ThrowsAsync<InvalidOperationException>(() => sut.DeleteForUserAsync(wrongUserId, popId));
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

            Assert.That(res.Tick, Is.EqualTo(8));
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

        [Test]
        public async Task SaveStateAsync_DeletesDead_AndUpdatesAliveOrganisms()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var popId = Guid.NewGuid();
            var org1Id = Guid.NewGuid();
            var org2Id = Guid.NewGuid();

            db.Populations.Add(new Population { Id = popId, UserId = userId, Name = "Test", Factors = SimFactorsJsonHelper.Write(Factors()) });
            db.Organisms.AddRange(
                new Organism { Id = org1Id, PopulationId = popId, Status = "alive", Fitness = 0.5 },
                new Organism { Id = org2Id, PopulationId = popId, Status = "alive", Fitness = 0.5 }
            );
            await db.SaveChangesAsync();

            var updates = new List<(Guid id, string status, double fitness)>
    {
        (org1Id, "dead", 0.0),     
        (org2Id, "reproduced", 0.9) 
    };

           
            await sut.SaveStateAsync(userId, popId, updates);

            var remainingOrgs = await db.Organisms.ToListAsync();
            Assert.That(remainingOrgs.Count, Is.EqualTo(1));
            Assert.That(remainingOrgs[0].Id, Is.EqualTo(org2Id));
            Assert.That(remainingOrgs[0].Status, Is.EqualTo("reproduced"));
            Assert.That(remainingOrgs[0].Fitness, Is.EqualTo(0.9));
        }

        [Test]
        public async Task TickAsync_HighFitnessAndResources_CanProduceOffspring()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var userId = Guid.NewGuid();
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "Reproduction Test",
                Factors = SimFactorsJsonHelper.Write(new SimFactors { Resources = 1.0, Temperature = 22 }) // Perfect conditions
            };

            for (int i = 0; i < 20; i++)
            {
                pop.Organisms.Add(new Organism { Id = Guid.NewGuid(), Status = "alive", Fitness = 1.0, Type = "mouse" });
            }

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var result = await sut.TickAsync(userId, pop.Id, steps: 10);

            var totalCount = await db.Organisms.CountAsync(o => o.PopulationId == pop.Id);
            Assert.That(totalCount, Is.GreaterThanOrEqualTo(20));
        }

        [Test]
        public async Task PublishAndUnpublish_UpdatesVisibilityCorrect()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));
            var userId = Guid.NewGuid();
            var popId = await sut.CreateAsync(userId, "Public Pop", Guid.NewGuid(), 1, "fox", Factors());

            var pubResult = await sut.PublishAsync(userId, popId);
            var pubPop = await db.Populations.FirstAsync(p => p.Id == popId);

            Assert.That(pubResult, Is.True);
            Assert.That(pubPop.IsPublic, Is.True);
            Assert.That(pubPop.PublishedAt, Is.Not.Null);

            var unpubResult = await sut.UnpublishAsync(userId, popId);
            var unpubPop = await db.Populations.FirstAsync(p => p.Id == popId);

            Assert.That(unpubResult, Is.True);
            Assert.That(unpubPop.IsPublic, Is.False);
            Assert.That(unpubPop.PublishedAt, Is.Null);
        }

        [Test]
        public async Task GetPublicAsync_ReturnsOnlyPublishedPopulations()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var u1 = Guid.NewGuid();
            db.Populations.Add(new Population { Id = Guid.NewGuid(), UserId = u1, Name = "Private", IsPublic = false, Factors = "{}" });
            db.Populations.Add(new Population { Id = Guid.NewGuid(), UserId = u1, Name = "Public", IsPublic = true, PublishedAt = DateTimeOffset.UtcNow, Factors = "{}" });
            await db.SaveChangesAsync();

           
            var results = await sut.GetPublicAsync();

            Assert.That(results.Count, Is.EqualTo(1));
            Assert.That(results[0].Name, Is.EqualTo("Public"));
        }

        [Test]
        public async Task GetByIdAsync_ReturnsPopulationWithIncludes()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var u1 = Guid.NewGuid();
            var baseModel = new DNAModel { Id = Guid.NewGuid(), Name = "Model", UserId = u1 };
            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = u1,
                Name = "Deep",
                BaseModel = baseModel,
                Factors = "{}"
            };
            pop.Organisms.Add(new Organism { Id = Guid.NewGuid(), Status = "alive" });

            db.DNA_Models.Add(baseModel);
            db.Populations.Add(pop);
            await db.SaveChangesAsync();

           
            var result = await sut.GetByIdAsync(pop.Id);

            Assert.That(result, Is.Not.Null);
            Assert.That(result.BaseModel, Is.Not.Null);
            Assert.That(result.Organisms.Count, Is.EqualTo(1));
        }

       
        [Test]
        public async Task PublishAsync_WhenNotFound_ReturnsFalse()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var result = await sut.PublishAsync(Guid.NewGuid(), Guid.NewGuid());
            Assert.That(result, Is.False);
        }

        [Test]
        public async Task UnpublishAsync_WhenNotFound_ReturnsFalse()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var result = await sut.UnpublishAsync(Guid.NewGuid(), Guid.NewGuid());
            Assert.That(result, Is.False);
        }

        

        [Test]
        public async Task TickAsync_ResetsReproducedStatusToAlive()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));
            var userId = Guid.NewGuid();

            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = "ResetTest",
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            var orgId = Guid.NewGuid();
            pop.Organisms.Add(new Organism { Id = orgId, Status = "reproduced", Fitness = 0.8 });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var result = await sut.TickAsync(userId, pop.Id, 1);

            var updatedOrg = result.Organisms.First(o => o.Id == orgId);
            Assert.That(updatedOrg.Status, Is.Not.EqualTo("reproduced") | Is.EqualTo("alive"));
        }

        [Test]
        public async Task SaveStateAsync_SkipsOrganismsNotInPayload()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));
            var userId = Guid.NewGuid();
            var popId = Guid.NewGuid();

            var orgId = Guid.NewGuid();
            db.Populations.Add(new Population { Id = popId, UserId = userId, Factors = "{}" });
            db.Organisms.Add(new Organism { Id = orgId, PopulationId = popId, Status = "alive", Fitness = 0.5 });
            await db.SaveChangesAsync();

            await sut.SaveStateAsync(userId, popId, new List<(Guid, string, double)>());

            var org = await db.Organisms.FirstAsync();
            Assert.That(org.Fitness, Is.EqualTo(0.5));
        }

       
        [Test]
        public async Task SaveStateAsync_WhenOrganismIdMissingFromPayload_ContinuesLoop()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));
            var userId = Guid.NewGuid();
            var popId = Guid.NewGuid();

            db.Populations.Add(new Population { Id = popId, UserId = userId, Factors = "{}" });
            db.Organisms.Add(new Organism { Id = Guid.NewGuid(), PopulationId = popId, Status = "alive" });
            await db.SaveChangesAsync();

            await sut.SaveStateAsync(userId, popId, new List<(Guid, string, double)>());

            var org = await db.Organisms.FirstAsync();
            Assert.That(org.Status, Is.EqualTo("alive")); 
        }

        [Test]
        public async Task TickAsync_WhenPopulationIsExtinct_AvgFitnessIsZero()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));
            var userId = Guid.NewGuid();

            var pop = new Population
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Factors = SimFactorsJsonHelper.Write(Factors())
            };
            pop.Organisms.Add(new Organism { Id = Guid.NewGuid(), Status = "dead", Fitness = 0 });

            db.Populations.Add(pop);
            await db.SaveChangesAsync();

            var result = await sut.TickAsync(userId, pop.Id, 1);

            Assert.That(result.AvgFitness, Is.EqualTo(0));
        }

        [Test]
        public async Task VisibilityMethods_ReturnFalse_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SimulationService(new EfTestRepository<Population>(db), new EfTestRepository<Organism>(db));

            var pub = await sut.PublishAsync(Guid.NewGuid(), Guid.NewGuid());
            var unpub = await sut.UnpublishAsync(Guid.NewGuid(), Guid.NewGuid());

            Assert.IsFalse(pub);
            Assert.IsFalse(unpub);
        }
    } 
}    
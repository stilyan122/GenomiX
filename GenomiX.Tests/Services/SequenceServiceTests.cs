using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Assert = NUnit.Framework.Assert;
namespace GenomiX.Tests.Services
{
    [TestFixture]
    public class SequenceServiceTests
    {
        [Test]
        public async Task CreateReferenceAsync_TrimsAndUppercases_AndPersists()
        {
            using var db = TestDbFactory.CreateDb();
            var userRepo = new EfTestRepository<DNASequence>(db);
            var refRepo = new EfTestRepository<ReferenceSequence>(db);

            var svc = new SequenceService(userRepo, refRepo);

            var userId = Guid.NewGuid();
            var id = await svc.CreateReferenceAsync(userId, "  Homo sapiens ", "  My Seq  ", " ac gt ");

            var saved = await db.Reference_Sequences.FirstOrDefaultAsync(x => x.Id == id);

            Assert.That(saved, Is.Not.Null);
            Assert.That(saved!.CreatedByUserId, Is.EqualTo(userId));
            Assert.That(saved.Species, Is.EqualTo("Homo sapiens"));
            Assert.That(saved.Name, Is.EqualTo("My Seq"));
            Assert.That(saved.Sequence, Is.EqualTo("AC GT"));

            Assert.That(saved.IsApproved, Is.False);
            Assert.That(saved.IsRejected, Is.False);
        }

        [Test]
        public async Task UpdateReferenceAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var ok = await svc.UpdateReferenceAsync(Guid.NewGuid(), Guid.NewGuid(), "s", "n", "ACGT");
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task UpdateReferenceAsync_ReturnsFalse_WhenNotOwner()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var other = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = false,
                IsRejected = false
            });

            var ok = await svc.UpdateReferenceAsync(other, id, "X", "Y", "TTTT");
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task UpdateReferenceAsync_ReturnsFalse_WhenApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = true,
                IsRejected = false,
                ApprovedAt = DateTimeOffset.UtcNow
            });

            var ok = await svc.UpdateReferenceAsync(owner, id, "X", "Y", "TTTT");
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task UpdateReferenceAsync_UpdatesFields_AndClearsRejection()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "Old",
                Name = "Old",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-2),
                IsApproved = false,
                IsRejected = true,
                RejectionReason = "bad",
                RejectedAt = DateTimeOffset.UtcNow.AddDays(-1)
            });

            var ok = await svc.UpdateReferenceAsync(owner, id, "  NewSp  ", "  NewName  ", " t t t t ");
            Assert.That(ok, Is.True);

            var saved = await db.Reference_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.Species, Is.EqualTo("NewSp"));
            Assert.That(saved.Name, Is.EqualTo("NewName"));
            Assert.That(saved.Sequence, Is.EqualTo("T T T T"));

            Assert.That(saved.IsRejected, Is.False);
            Assert.That(saved.RejectionReason, Is.Null);
            Assert.That(saved.RejectedAt, Is.Null);
        }

        [Test]
        public async Task DeleteReferenceAsync_ReturnsFalse_WhenApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = true,
                ApprovedAt = DateTimeOffset.UtcNow
            });

            var ok = await svc.DeleteReferenceAsync(owner, id);
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task DeleteReferenceAsync_ReturnsFalse_WhenNotOwner()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var other = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = false,
                IsRejected = false
            });

            var ok = await svc.DeleteReferenceAsync(other, id);
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task DeleteReferenceAsync_Deletes_WhenOwnedAndNotApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var owner = Guid.NewGuid();
            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = owner,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = false,
                IsRejected = false
            });

            var ok = await svc.DeleteReferenceAsync(owner, id);
            Assert.That(ok, Is.True);

            Assert.That(await db.Reference_Sequences.AnyAsync(x => x.Id == id), Is.False);
        }

        [Test]
        public async Task ApproveReferenceAsync_SetsApproved_AndClearsRejected()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = Guid.NewGuid(),
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                IsApproved = false,
                IsRejected = true,
                RejectionReason = "x"
            });

            var ok = await svc.ApproveReferenceAsync(id);
            Assert.That(ok, Is.True);

            var saved = await db.Reference_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.IsApproved, Is.True);
            Assert.That(saved.IsRejected, Is.False);
            Assert.That(saved.RejectionReason, Is.Null);
            Assert.That(saved.ApprovedAt, Is.Not.Null);
            Assert.That(saved.RejectedAt, Is.Null);
        }

        [Test]
        public async Task RejectReferenceAsync_ReturnsFalse_WhenAlreadyApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = Guid.NewGuid(),
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = true,
                ApprovedAt = DateTimeOffset.UtcNow
            });

            var ok = await svc.RejectReferenceAsync(id, "reason");
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task RejectReferenceAsync_SetsRejected_AndStoresReason()
        {
            using var db = TestDbFactory.CreateDb();
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), refRepo);

            var id = Guid.NewGuid();

            await refRepo.AddAsync(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = Guid.NewGuid(),
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                IsApproved = false,
                IsRejected = false
            });

            var ok = await svc.RejectReferenceAsync(id, "  invalid format  ");
            Assert.That(ok, Is.True);

            var saved = await db.Reference_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.IsRejected, Is.True);
            Assert.That(saved.RejectionReason, Is.EqualTo("invalid format"));
            Assert.That(saved.RejectedAt, Is.Not.Null);
        }

        [Test]
        public void AddUserSequenceAsync_Throws_WhenInvalidBases()
        {
            using var db = TestDbFactory.CreateDb();
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            Assert.ThrowsAsync<ArgumentException>(async () =>
                await svc.AddUserSequenceAsync(new DNASequence { Id = Guid.NewGuid(), Sequence = "ACGTX" })
            );
        }

        [Test]
        public async Task AddUserSequenceAsync_Normalizes_AndPersists()
        {
            using var db = TestDbFactory.CreateDb();
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            await svc.AddUserSequenceAsync(new DNASequence { Id = id, Sequence = " a c g t " });

            var saved = await db.DNA_Sequences.FirstOrDefaultAsync(x => x.Id == id);
            Assert.That(saved, Is.Not.Null);
            Assert.That(saved!.Sequence, Is.EqualTo("ACGT"));
        }

        [Test]
        public void UpdateUserSequenceAsync_Throws_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var svc = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            Assert.ThrowsAsync<ArgumentException>(async () =>
                await svc.UpdateUserSequenceAsync(new DNASequence { Id = Guid.NewGuid(), Sequence = "ACGT" })
            );
        }

        [Test]
        public async Task UpdateUserSequenceAsync_UpdatesExisting()
        {
            using var db = TestDbFactory.CreateDb();
            var userRepo = new EfTestRepository<DNASequence>(db);
            var svc = new SequenceService(userRepo, new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            await userRepo.AddAsync(new DNASequence { Id = id, Sequence = "ACGT" });

            await svc.UpdateUserSequenceAsync(new DNASequence { Id = id, Sequence = " t t t t " });

            var saved = await db.DNA_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.Sequence, Is.EqualTo("TTTT"));
        }

        [Test]
        public async Task GetApprovedAsync_ReturnsOnlyApprovedNotRejected()
        {
            using var db = TestDbFactory.CreateDb();

            var userRepo = new EfTestRepository<DNASequence>(db);
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var sut = new SequenceService(userRepo, refRepo);

            var uA = new GenUser { Id = Guid.NewGuid(), UserName = "a", FirstName = "A", LastName = "Z", Email = "a@x.com" };
            var uB = new GenUser { Id = Guid.NewGuid(), UserName = "b", FirstName = "B", LastName = "Z", Email = "b@x.com" };
            var uC = new GenUser { Id = Guid.NewGuid(), UserName = "c", FirstName = "C", LastName = "Z", Email = "c@x.com" };

            var a = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = uA.Id,
                Species = "S",
                Name = "A",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
                ApprovedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                CreatedByUser = uA,
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
            };

            var b = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = uB.Id,
                Species = "S",
                Name = "B",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-3),
                ApprovedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                CreatedByUser = uB,
                RejectedAt = DateTimeOffset.UtcNow.AddMinutes(-2),
                RejectionReason = "Rejected...",
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-2)
            };

            var c = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = uC.Id,
                Species = "S",
                Name = "C",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = true, 
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-2),
                ApprovedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
                CreatedByUser = uC,
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-1)
            };

            await refRepo.AddAsync(a);
            await refRepo.AddAsync(b);
            await refRepo.AddAsync(c);

            var res = await sut.GetApprovedAsync();

            Assert.AreEqual(res.Count, 1);
            Assert.That(res[0].Name, Is.EqualTo("A"));
        }

        [Test]
        public async Task RejectReferenceAsync_ReturnsFalse_WhenApproved()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            db.Reference_Sequences.Add(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = Guid.NewGuid(),
                Species = "S",
                Name = "A",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();

            var ok = await sut.RejectReferenceAsync(id, "x");
            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task GetPendingAsync_ReturnsOnlyNotApprovedNotRejected_OrderedByCreatedAtDesc()
        {
            using var db = TestDbFactory.CreateDb();
            var userRepo = new EfTestRepository<DNASequence>(db);
            var refRepo = new EfTestRepository<ReferenceSequence>(db);
            var sut = new SequenceService(userRepo, refRepo);

            var u = new GenUser { Id = Guid.NewGuid(), UserName = "u", FirstName = "U", LastName = "L", Email = "u@x.com" };

            var oldPending = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "OldPending",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-2),
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-2)
            };

            var newPending = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "NewPending",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-1)
            };

            var approved = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "Approved",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-3),
                ApprovedAt = DateTimeOffset.UtcNow.AddHours(-2),
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-2)
            };

            var rejected = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "Rejected",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = true,
                CreatedAt = DateTimeOffset.UtcNow.AddHours(-4),
                RejectedAt = DateTimeOffset.UtcNow.AddHours(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddHours(-1)
            };

            await refRepo.AddAsync(oldPending);
            await refRepo.AddAsync(newPending);
            await refRepo.AddAsync(approved);
            await refRepo.AddAsync(rejected);

            var res = await sut.GetPendingAsync();

            Assert.That(res.Count, Is.EqualTo(2));
            Assert.That(res[0].Name, Is.EqualTo("NewPending"));
            Assert.That(res[1].Name, Is.EqualTo("OldPending"));
            Assert.That(res.All(x => !x.IsApproved && !x.IsRejected), Is.True);
            Assert.That(res[0].CreatedByUser, Is.Not.Null);
        }

        [Test]
        public async Task GetRejectedAsync_ReturnsOnlyRejectedNotApproved_OrderedByRejectedAtOrCreatedAtDesc()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var u = new GenUser { Id = Guid.NewGuid(), UserName = "u", FirstName = "U", LastName = "L", Email = "u@x.com" };

            var rOld = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "OldRejected",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = true,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
                RejectedAt = DateTimeOffset.UtcNow.AddDays(-2),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-2)
            };

            var rNew = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "NewRejected",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = true,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-3),
                RejectedAt = DateTimeOffset.UtcNow.AddDays(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
            };

            var approved = new ReferenceSequence
            {
                Id = Guid.NewGuid(),
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "Approved",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-5),
                ApprovedAt = DateTimeOffset.UtcNow.AddDays(-4),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-4)
            };

            db.Reference_Sequences.AddRange(rOld, rNew, approved);
            await db.SaveChangesAsync();

            var res = await sut.GetRejectedAsync();

            Assert.That(res.Count, Is.EqualTo(2));
            Assert.That(res[0].Name, Is.EqualTo("NewRejected"));
            Assert.That(res[1].Name, Is.EqualTo("OldRejected"));
            Assert.That(res.All(x => x.IsRejected && !x.IsApproved), Is.True);
        }

        [Test]
        public async Task GetMineAsync_ReturnsOnlyCreatedByUser_OrderedByCreatedAtDesc()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var uA = new GenUser { Id = Guid.NewGuid(), UserName = "a", FirstName = "A", LastName = "Z", Email = "a@x.com" };
            var uB = new GenUser { Id = Guid.NewGuid(), UserName = "b", FirstName = "B", LastName = "Z", Email = "b@x.com" };
            var uC = new GenUser { Id = Guid.NewGuid(), UserName = "c", FirstName = "C", LastName = "Z", Email = "c@x.com" };

            db.Reference_Sequences.AddRange(
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = uA.Id, CreatedByUser = uA, Species = "S", Name = "Old", Sequence = "ACGT", CreatedAt = DateTimeOffset.UtcNow.AddHours(-2), UpdatedAt = DateTimeOffset.UtcNow.AddHours(-2) },
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = uA.Id, CreatedByUser = uA, Species = "S", Name = "New", Sequence = "ACGT", CreatedAt = DateTimeOffset.UtcNow.AddHours(-1), UpdatedAt = DateTimeOffset.UtcNow.AddHours(-1) },
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = uC.Id, CreatedByUser = uC, Species = "S", Name = "Other", Sequence = "ACGT", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow }
            );
            await db.SaveChangesAsync();

            var res = await sut.GetMineAsync(uA.Id);

            Assert.That(res.Count, Is.EqualTo(2));
            Assert.That(res[0].Name, Is.EqualTo("New"));
            Assert.That(res[1].Name, Is.EqualTo("Old"));
            Assert.That(res.All(x => x.CreatedByUserId == uA.Id), Is.True);
        }

        [Test]
        public async Task GetPendingMineAsync_ReturnsOnlyMinePending()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var uA = new GenUser { Id = Guid.NewGuid(), UserName = "a", FirstName = "A", LastName = "Z", Email = "a@x.com" };
            var uB = new GenUser { Id = Guid.NewGuid(), UserName = "b", FirstName = "B", LastName = "Z", Email = "b@x.com" };
            var uC = new GenUser { Id = Guid.NewGuid(), UserName = "c", FirstName = "C", LastName = "Z", Email = "c@x.com" };


            db.Reference_Sequences.AddRange(
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = uA.Id, CreatedByUser = uA, Species = "S", Name = "Pending", Sequence = "ACGT", IsApproved = false, IsRejected = false, CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-1), UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-1) },
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = Guid.NewGuid(), Species = "S", Name = "Approved", Sequence = "ACGT", IsApproved = true, IsRejected = false, CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-2), ApprovedAt = DateTimeOffset.UtcNow.AddMinutes(-1), UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-1) },
                new ReferenceSequence { Id = Guid.NewGuid(), CreatedByUserId = Guid.NewGuid(), Species = "S", Name = "Rejected", Sequence = "ACGT", IsApproved = false, IsRejected = true, CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-3), RejectedAt = DateTimeOffset.UtcNow.AddMinutes(-2), UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-2) }
            );
            await db.SaveChangesAsync();

            var res = await sut.GetPendingMineAsync(uA.Id);

            Assert.That(res.Count, Is.EqualTo(1));
            Assert.That(res[0].Name, Is.EqualTo("Pending"));
        }

        [Test]
        public async Task CreateReferenceAsync_AllowsNullInputs_StoresEmptyTrimmedAndUppercase()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var userId = Guid.NewGuid();
            var id = await sut.CreateReferenceAsync(userId, null!, null!, null!);

            var saved = await db.Reference_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.Species, Is.EqualTo(string.Empty));
            Assert.That(saved.Name, Is.EqualTo(string.Empty));
            Assert.That(saved.Sequence, Is.EqualTo(string.Empty));
        }

        [Test]
        public async Task ApproveReferenceAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var ok = await sut.ApproveReferenceAsync(Guid.NewGuid());

            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task ApproveReferenceAsync_ReturnsTrue_WhenAlreadyApproved_DoesNotChangeToRejected()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            db.Reference_Sequences.Add(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = Guid.NewGuid(),
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                IsApproved = true,
                IsRejected = false,
                ApprovedAt = DateTimeOffset.UtcNow.AddDays(-1),
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
            });
            await db.SaveChangesAsync();

            var ok = await sut.ApproveReferenceAsync(id);

            Assert.That(ok, Is.True);

            var saved = await db.Reference_Sequences.FirstAsync(x => x.Id == id);
            Assert.That(saved.IsApproved, Is.True);
            Assert.That(saved.IsRejected, Is.False);
        }

        [Test]
        public async Task RejectReferenceAsync_ReturnsFalse_WhenNotFound()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var ok = await sut.RejectReferenceAsync(Guid.NewGuid(), "x");

            Assert.That(ok, Is.False);
        }

        [Test]
        public async Task GetReferenceSequenceByIdAsync_ReturnsNull_WhenMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var res = await sut.GetReferenceSequenceByIdAsync(Guid.NewGuid());

            Assert.That(res, Is.Null);
        }

        [Test]
        public async Task GetReferenceSequenceByIdAsync_ReturnsEntity_WithCreatedByUser()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var u = new GenUser { Id = Guid.NewGuid(), UserName = "u", FirstName = "U", LastName = "L", Email = "u@x.com" };

            var id = Guid.NewGuid();
            db.Reference_Sequences.Add(new ReferenceSequence
            {
                Id = id,
                CreatedByUserId = u.Id,
                CreatedByUser = u,
                Species = "S",
                Name = "N",
                Sequence = "ACGT",
                IsApproved = false,
                IsRejected = false,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
                UpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
            });
            await db.SaveChangesAsync();

            var res = await sut.GetReferenceSequenceByIdAsync(id);

            Assert.That(res, Is.Not.Null);
            Assert.That(res!.CreatedByUser, Is.Not.Null);
            Assert.That(res.CreatedByUser!.UserName, Is.EqualTo("u"));
        }

        [Test]
        public void AddUserSequenceAsync_Throws_WhenEmptyOrWhitespace()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            Assert.ThrowsAsync<ArgumentException>(async () =>
                await sut.AddUserSequenceAsync(new DNASequence { Id = Guid.NewGuid(), Sequence = "   " })
            );
        }

        [Test]
        public async Task DeleteUserSequenceAsync_DoesNothing_WhenMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            await sut.DeleteUserSequenceAsync(Guid.NewGuid());

            // no exception and DB remains empty
            Assert.That(await db.DNA_Sequences.CountAsync(), Is.EqualTo(0));
        }

        [Test]
        public async Task DeleteUserSequenceAsync_Deletes_WhenExists()
        {
            using var db = TestDbFactory.CreateDb();
            var userRepo = new EfTestRepository<DNASequence>(db);
            var sut = new SequenceService(userRepo, new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            await userRepo.AddAsync(new DNASequence { Id = id, Sequence = "ACGT" });

            await sut.DeleteUserSequenceAsync(id);

            Assert.That(await db.DNA_Sequences.AnyAsync(x => x.Id == id), Is.False);
        }

        [Test]
        public async Task GetAllUserSequencesAsync_ReturnsAll()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            db.DNA_Sequences.AddRange(
                new DNASequence { Id = Guid.NewGuid(), Sequence = "ACGT" },
                new DNASequence { Id = Guid.NewGuid(), Sequence = "TTTT" }
            );
            await db.SaveChangesAsync();

            var all = (await sut.GetAllUserSequencesAsync()).ToList();

            Assert.That(all.Count, Is.EqualTo(2));
        }

        [Test]
        public async Task GetUserSequenceByIdAsync_ReturnsNull_WhenMissing()
        {
            using var db = TestDbFactory.CreateDb();
            var sut = new SequenceService(new EfTestRepository<DNASequence>(db), new EfTestRepository<ReferenceSequence>(db));

            var res = await sut.GetUserSequenceByIdAsync(Guid.NewGuid());

            Assert.That(res, Is.Null);
        }

        [Test]
        public async Task GetUserSequenceByIdAsync_ReturnsEntity_WhenExists()
        {
            using var db = TestDbFactory.CreateDb();
            var userRepo = new EfTestRepository<DNASequence>(db);
            var sut = new SequenceService(userRepo, new EfTestRepository<ReferenceSequence>(db));

            var id = Guid.NewGuid();
            await userRepo.AddAsync(new DNASequence { Id = id, Sequence = "ACGT" });

            var res = await sut.GetUserSequenceByIdAsync(id);

            Assert.That(res, Is.Not.Null);
            Assert.That(res!.Id, Is.EqualTo(id));
        }
    }
}
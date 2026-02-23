using FluentAssertions;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using Assert = NUnit.Framework.Assert;

namespace GenomiX.Tests.Services;

[TestFixture]
public class DNAServiceTests
{
    [Test]
    public async Task GetAllForUserAsync_FiltersByUser_IncludesSequences_OrdersByUpdatedAtDesc()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var u1 = Guid.NewGuid();
        var u2 = Guid.NewGuid();

        var mOld = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = u1,
            Name = "Old",
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-2),
            Sequences = new List<DNASequence>
            {
                new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "AAAA" },
                new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "TTTT" }
            }
        };

        var mNew = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = u1,
            Name = "New",
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            Sequences = new List<DNASequence>
            {
                new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "CCCC" },
                new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "GGGG" }
            }
        };

        var other = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = u2,
            Name = "Other",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(mOld);
        await repo.AddAsync(mNew);
        await repo.AddAsync(other);

        var list = await sut.GetAllForUserAsync(u1);

        list.Should().HaveCount(2);
        list.Select(x => x.Id).Should().ContainInOrder(mNew.Id, mOld.Id);
        list.All(x => x.UserId == u1).Should().BeTrue();
        list[0].Sequences.Should().NotBeNull();
        list[0].Sequences.Should().HaveCount(2);
    }

    [Test]
    public async Task UpdateModelSequencesAsync_Throws_WhenModelMissing()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var act = async () => await sut.UpdateModelSequencesAsync(Guid.NewGuid(), Guid.NewGuid(), "A", "T");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Model not found.");
    }

    [Test]
    public async Task UpdateModelSequencesAsync_UpdatesBothStrands_AndUpdatedAt()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var userId = Guid.NewGuid();
        var modelId = Guid.NewGuid();

        var model = new DNAModel
        {
            Id = modelId,
            UserId = userId,
            Name = "X",
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-10),
            Sequences = new List<DNASequence>
            {
                new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "AAAA" },
                new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "TTTT" }
            }
        };

        await repo.AddAsync(model);

        var before = model.UpdatedAt;

        await sut.UpdateModelSequencesAsync(userId, modelId, "CC", "GG");

        var reloaded = await repo.GetByIdAsync(modelId);
        reloaded.Should().NotBeNull();
        reloaded!.Sequences.First(s => s.Strand == 1).Sequence.Should().Be("CC");
        reloaded.Sequences.First(s => s.Strand == 2).Sequence.Should().Be("GG");
        reloaded.UpdatedAt.Should().BeAfter(before);
    }

    [Test]
    public async Task RenameAsync_TrimsName_AndUpdatesUpdatedAt()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var userId = Guid.NewGuid();
        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Before",
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        };

        await repo.AddAsync(model);
        var before = model.UpdatedAt;

        await sut.RenameAsync(userId, model.Id, "   After   ");

        var reloaded = await repo.GetByIdAsync(model.Id);
        reloaded!.Name.Should().Be("After");
        reloaded.UpdatedAt.Should().BeAfter(before);
    }

    [Test]
        public async Task DeleteForUserAsync_Throws_WhenNotOwned()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var model = new DNAModel { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "X" };
        await repo.AddAsync(model);

        var act = async () => await sut.DeleteForUserAsync(Guid.NewGuid(), model.Id);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Model not found.");
    }

    [Test]
    public async Task AddAsync_CallsRepositoryAdd()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var m = new DNAModel { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "X", UpdatedAt = DateTimeOffset.UtcNow };
        await sut.AddAsync(m);

        Assert.That(await db.DNA_Models.AnyAsync(x => x.Id == m.Id), Is.True);
    }

    [Test]
    public async Task GetAllAsync_ReturnsAll()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        db.DNA_Models.AddRange(
            new DNAModel { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "A", UpdatedAt = DateTimeOffset.UtcNow },
            new DNAModel { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Name = "B", UpdatedAt = DateTimeOffset.UtcNow }
        );
        await db.SaveChangesAsync();

        var all = (await sut.GetAllAsync()).ToList();
        Assert.That(all.Count, Is.EqualTo(2));
    }

    [Test]
    public void RenameAsync_Throws_WhenModelNotFound()
    {
        using var db = TestDbFactory.CreateDb();
        var sut = new DNAService(new EfTestRepository<DNAModel>(db));

        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await sut.RenameAsync(Guid.NewGuid(), Guid.NewGuid(), "New")
        );
    }

    [Test]
    public async Task UpdateModelSequencesAsync_UpdatesStrand1And2()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var userId = Guid.NewGuid();
        var modelId = Guid.NewGuid();

        var model = new DNAModel
        {
            Id = modelId,
            UserId = userId,
            Name = "M",
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            Sequences = new List<DNASequence>
        {
            new DNASequence { Id = Guid.NewGuid(), ModelId = modelId, Strand = 1, Sequence = "AAAA" },
            new DNASequence { Id = Guid.NewGuid(), ModelId = modelId, Strand = 2, Sequence = "TTTT" }
        }
        };

        db.DNA_Models.Add(model);
        await db.SaveChangesAsync();

        await sut.UpdateModelSequencesAsync(userId, modelId, "CCCC", "GGGG");

        var saved = await db.DNA_Models.Include(m => m.Sequences).FirstAsync(m => m.Id == modelId);
        Assert.That(saved.Sequences.First(s => s.Strand == 1).Sequence, Is.EqualTo("CCCC"));
        Assert.That(saved.Sequences.First(s => s.Strand == 2).Sequence, Is.EqualTo("GGGG"));
    }

    [Test]
    public void UpdateModelSequencesAsync_Throws_WhenSequencesMissing()
    {
        using var db = TestDbFactory.CreateDb();
        var sut = new DNAService(new EfTestRepository<DNAModel>(db));

        var userId = Guid.NewGuid();
        var modelId = Guid.NewGuid();

        db.DNA_Models.Add(new DNAModel
        {
            Id = modelId,
            UserId = userId,
            Name = "M",
            UpdatedAt = DateTimeOffset.UtcNow,
            Sequences = new List<DNASequence>
        {
            new DNASequence { Id = Guid.NewGuid(), ModelId = modelId, Strand = 1, Sequence = "AAAA" }
        }
        });
        db.SaveChanges();

        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await sut.UpdateModelSequencesAsync(userId, modelId, "CCCC", "GGGG")
        );
    }

    [Test]
    public async Task GetByIdAsync_ReturnsModel_WhenExists()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Name = "X",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(model);

        var found = await sut.GetByIdAsync(model.Id);

        found.Should().NotBeNull();
        found!.Id.Should().Be(model.Id);
    }

    [Test]
    public async Task GetByIdAsync_ReturnsNull_WhenMissing()
    {
        using var db = TestDbFactory.CreateDb();
        var sut = new DNAService(new EfTestRepository<DNAModel>(db));

        var found = await sut.GetByIdAsync(Guid.NewGuid());

        found.Should().BeNull();
    }

    [Test]
    public async Task UpdateAsync_PersistsChanges()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Name = "Before",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(model);

        model.Name = "After";
        await sut.UpdateAsync(model);

        var reloaded = await db.DNA_Models.FirstAsync(x => x.Id == model.Id);
        reloaded.Name.Should().Be("After");
    }

    [Test]
    public async Task DeleteAsync_DeletesEntity()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Name = "ToDelete",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(model);

        await sut.DeleteAsync(model.Id);

        (await db.DNA_Models.AnyAsync(x => x.Id == model.Id)).Should().BeFalse();
    }

    [Test]
    public async Task GetModelForUserWithSequencesAsync_ReturnsNull_WhenWrongUser()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var owner = Guid.NewGuid();
        var otherUser = Guid.NewGuid();

        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = owner,
            Name = "M",
            UpdatedAt = DateTimeOffset.UtcNow,
            Sequences = new List<DNASequence>
        {
            new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "AAAA" },
            new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "TTTT" }
        }
        };

        await repo.AddAsync(model);

        var result = await sut.GetModelForUserWithSequencesAsync(otherUser, model.Id);

        result.Should().BeNull();
    }

    [Test]
    public async Task GetModelForUserWithSequencesAsync_ReturnsModel_WithSequences_WhenOwned()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var userId = Guid.NewGuid();
        var modelId = Guid.NewGuid();

        var model = new DNAModel
        {
            Id = modelId,
            UserId = userId,
            Name = "M",
            UpdatedAt = DateTimeOffset.UtcNow,
            Sequences = new List<DNASequence>
        {
            new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "AAAA" },
            new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "TTTT" }
        }
        };

        await repo.AddAsync(model);

        var result = await sut.GetModelForUserWithSequencesAsync(userId, modelId);

        result.Should().NotBeNull();
        result!.Id.Should().Be(modelId);
        result.Sequences.Should().NotBeNull();
        result.Sequences.Should().HaveCount(2);
    }

    [Test]
    public async Task UpdateModelSequencesAsync_Throws_WhenNotOwned()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var owner = Guid.NewGuid();
        var attacker = Guid.NewGuid();
        var modelId = Guid.NewGuid();

        var model = new DNAModel
        {
            Id = modelId,
            UserId = owner,
            Name = "M",
            UpdatedAt = DateTimeOffset.UtcNow,
            Sequences = new List<DNASequence>
        {
            new DNASequence { Id = Guid.NewGuid(), Strand = 1, Sequence = "AAAA" },
            new DNASequence { Id = Guid.NewGuid(), Strand = 2, Sequence = "TTTT" }
        }
        };

        await repo.AddAsync(model);

        var act = async () => await sut.UpdateModelSequencesAsync(attacker, modelId, "CC", "GG");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Model not found.");
    }

    [Test]
    public async Task RenameAsync_Throws_WhenNotOwned()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var owner = Guid.NewGuid();
        var attacker = Guid.NewGuid();
        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = owner,
            Name = "Before",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(model);

        var act = async () => await sut.RenameAsync(attacker, model.Id, "After");

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Model not found.");
    }

    [Test]
    public async Task DeleteForUserAsync_Deletes_WhenOwned()
    {
        using var db = TestDbFactory.CreateDb();
        var repo = new EfTestRepository<DNAModel>(db);
        var sut = new DNAService(repo);

        var userId = Guid.NewGuid();
        var model = new DNAModel
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Owned",
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await repo.AddAsync(model);

        await sut.DeleteForUserAsync(userId, model.Id);

        (await db.DNA_Models.AnyAsync(x => x.Id == model.Id)).Should().BeFalse();
    }
}
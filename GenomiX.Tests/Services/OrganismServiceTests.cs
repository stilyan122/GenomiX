using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Moq;
using NUnit.Framework;
using Assert = NUnit.Framework.Assert;

namespace GenomiX.Tests.Services
{
    [TestFixture]
    public class OrganismServiceTests
    {
        [Test]
        public async Task AddAsync_CallsRepositoryAddAsync()
        {
            var repo = new Mock<IRepository<Organism>>();
            var svc = new OrganismService(repo.Object);

            var organism = new Organism { Id = Guid.NewGuid() };

            await svc.AddAsync(organism);

            repo.Verify(r => r.AddAsync(organism), Times.Once);
        }

        [Test]
        public async Task UpdateAsync_CallsRepositoryUpdateAsync()
        {
            var repo = new Mock<IRepository<Organism>>();
            var svc = new OrganismService(repo.Object);

            var organism = new Organism { Id = Guid.NewGuid() };

            await svc.UpdateAsync(organism);

            repo.Verify(r => r.UpdateAsync(organism), Times.Once);
        }

        [Test]
        public async Task DeleteAsync_CallsRepositoryDeleteAsync()
        {
            var repo = new Mock<IRepository<Organism>>();
            var svc = new OrganismService(repo.Object);

            var id = Guid.NewGuid();

            await svc.DeleteAsync(id);

            repo.Verify(r => r.DeleteAsync(id), Times.Once);
        }

        [Test]
        public async Task GetByIdAsync_ReturnsRepositoryValue()
        {
            var repo = new Mock<IRepository<Organism>>();
            var svc = new OrganismService(repo.Object);

            var id = Guid.NewGuid();
            var expected = new Organism { Id = id };

            repo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(expected);

            var result = await svc.GetByIdAsync(id);

            Assert.That(result, Is.SameAs(expected));
        }

        [Test]
        public async Task GetAllAsync_ReturnsRepositoryQuery()
        {
            var repo = new Mock<IRepository<Organism>>();
            var svc = new OrganismService(repo.Object);

            var data = new List<Organism>
        {
            new Organism { Id = Guid.NewGuid() },
            new Organism { Id = Guid.NewGuid() }
        }.AsQueryable();

            repo.Setup(r => r.GetAll()).Returns(data);

            var result = await svc.GetAllAsync();

            Assert.That(result.Count(), Is.EqualTo(2));
        }
    }
}

using FluentAssertions;
using GenomiX.Core.Services;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Moq;
using MockQueryable.Moq;
using NUnit.Framework;

namespace GenomiX.Tests.Services
{
    [TestFixture]
    public class ScanServiceTests
    {
        private Mock<IRepository<Disease>> _diseaseRepoMock;
        private Mock<IRepository<DiseaseMutationPattern>> _patternRepoMock;
        private ScanService _sut;

        [SetUp]
        public void SetUp()
        {
            _diseaseRepoMock = new Mock<IRepository<Disease>>();
            _patternRepoMock = new Mock<IRepository<DiseaseMutationPattern>>();
            _sut = new ScanService(_diseaseRepoMock.Object, _patternRepoMock.Object);
        }

        [Test]
        public async Task ScanAsync_WhenPatternsMatch_ReturnsCorrectResultsAndConfidence()
        {
            var diseaseId = Guid.NewGuid();
            var diseases = new List<Disease>
        {
            new Disease
            {
                Id = diseaseId,
                Name = "Sickle Cell",
                Description = "Blood disorder",
                MutationPatterns = new List<DiseaseMutationPattern>
                {
                    new DiseaseMutationPattern { PatternSequence = "GCTC", GeneName = "HBB" },
                    new DiseaseMutationPattern { PatternSequence = "AAAA", GeneName = "HBB" }
                }
            }
        }.AsQueryable().BuildMock();

            _diseaseRepoMock.Setup(x => x.GetAll()).Returns(diseases);

            string strand1 = "NNNGCTCNNN"; 
            string strand2 = "NNNNNNNNNN"; 

            var results = await _sut.ScanAsync(strand1, strand2);

            results.Should().HaveCount(1);
            var result = results.First();
            result.DiseaseName.Should().Be("Sickle Cell");
            result.MatchedPatterns.Should().Be(1);
            result.TotalPatterns.Should().Be(2);
            result.Confidence.Should().Be(0.5); 

            result.Matches.Should().ContainSingle();
            result.Matches.First().Strand.Should().Be("strand1");
            result.Matches.First().MatchedIndex.Should().Be(3);
        }

        [Test]
        public async Task ScanAsync_WhenPatternExistsInBothStrands_ReturnsTwoMatchesInResult()
        {
            var diseases = new List<Disease>
        {
            new Disease
            {
                Id = Guid.NewGuid(),
                Name = "Test Disease",
                MutationPatterns = new List<DiseaseMutationPattern>
                {
                    new DiseaseMutationPattern { PatternSequence = "ATGC" }
                }
            }
        }.AsQueryable().BuildMock();

            _diseaseRepoMock.Setup(x => x.GetAll()).Returns(diseases);

            var results = await _sut.ScanAsync("ATGC", "ATGC");

            results.First().Matches.Should().HaveCount(2);
            results.First().Matches.Should().Contain(m => m.Strand == "strand1");
            results.First().Matches.Should().Contain(m => m.Strand == "strand2");
        }

        [Test]
        public async Task ScanAsync_WhenNoPatternsMatch_ReturnsEmptyCollection()
        {
            var diseases = new List<Disease>
        {
            new Disease { Name = "D1", MutationPatterns = new List<DiseaseMutationPattern> { new() { PatternSequence = "XYZ" } } }
        }.AsQueryable().BuildMock();

            _diseaseRepoMock.Setup(x => x.GetAll()).Returns(diseases);

            var results = await _sut.ScanAsync("AAAA", "TTTT");

            results.Should().BeEmpty();
        }

        [Test]
        public async Task ScanAsync_WithEmptyPatterns_DoesNotThrowAndReturnsEmpty()
        {
            var diseases = new List<Disease>
        {
            new Disease { Name = "Empty", MutationPatterns = new List<DiseaseMutationPattern>() }
        }.AsQueryable().BuildMock();

            _diseaseRepoMock.Setup(x => x.GetAll()).Returns(diseases);

            var results = await _sut.ScanAsync("AGTC", "AGTC");

            results.Should().BeEmpty();
        }
    }
}

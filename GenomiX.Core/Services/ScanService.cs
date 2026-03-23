using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using Microsoft.EntityFrameworkCore;

namespace GenomiX.Core.Services
{
    /// <summary>
    /// Provides functionality for performing scan operations within the application.
    /// </summary>
    public class ScanService : IScanService
    {
        private readonly IRepository<Disease> _diseaseRepo;
        private readonly IRepository<DiseaseMutationPattern> _patternRepo;

        /// <summary>
        /// Initializes a new instance of the ScanService class with the specified repositories.
        /// </summary>
        public ScanService(
            IRepository<Disease> diseaseRepo,
            IRepository<DiseaseMutationPattern> patternRepo)
        {
            _diseaseRepo = diseaseRepo;
            _patternRepo = patternRepo;
        }

        /// <inheritdoc />
        public async Task<ICollection<DiseaseScanMatchDto>> ScanAsync(string strand1, string strand2)
        {
            var result = new List<DiseaseScanMatchDto>();

            var diseases = await _diseaseRepo
                .GetAll()
                .Include(d => d.MutationPatterns)
                .ToListAsync();

            foreach (var disease in diseases)
            {
                foreach (var pattern in disease.MutationPatterns)
                {
                    var match1 = strand1.IndexOf(pattern.PatternSequence, StringComparison.Ordinal);
                    var match2 = strand2.IndexOf(pattern.PatternSequence, StringComparison.Ordinal);

                    if (match1 >= 0)
                    {
                        result.Add(new DiseaseScanMatchDto
                        {
                            DiseaseId = disease.Id,
                            DiseaseName = disease.Name,
                            Description = disease.Description,
                            GeneName = pattern.GeneName,
                            PatternSequence = pattern.PatternSequence,
                            IsMatch = true,
                            MatchedIndex = match1,
                            Strand = "strand1"
                        });
                    }

                    if (match2 >= 0)
                    {
                        result.Add(new DiseaseScanMatchDto
                        {
                            DiseaseId = disease.Id,
                            DiseaseName = disease.Name,
                            Description = disease.Description,
                            GeneName = pattern.GeneName,
                            PatternSequence = pattern.PatternSequence,
                            IsMatch = true,
                            MatchedIndex = match2,
                            Strand = "strand2"
                        });
                    }
                }
            }

            return result;
        }
    }
}

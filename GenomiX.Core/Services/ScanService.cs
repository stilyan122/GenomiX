using GenomiX.Core.Interfaces;
using GenomiX.Core.Models;
using GenomiX.Infrastructure.Models;
using GenomiX.Infrastructure.Repo;
using GenomiX.ViewModels.Disease;
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
        public async Task<ICollection<DiseaseScanResultDto>> ScanAsync(string strand1, string strand2)
        {
            var diseases = await _diseaseRepo
               .GetAll()
               .Include(d => d.MutationPatterns)
               .ToListAsync();

            var results = new List<DiseaseScanResultDto>();

            foreach (var disease in diseases)
            {
                var matches = new List<DiseaseScanMatchDto>();

                foreach (var pattern in disease.MutationPatterns)
                {
                    var idx1 = strand1.IndexOf(pattern.PatternSequence, StringComparison.Ordinal);
                    var idx2 = strand2.IndexOf(pattern.PatternSequence, StringComparison.Ordinal);

                    if (idx1 >= 0)
                    {
                        matches.Add(new DiseaseScanMatchDto
                        {
                            DiseaseId = disease.Id,
                            DiseaseName = disease.Name,
                            Description = disease.Description,
                            GeneName = pattern.GeneName,
                            PatternSequence = pattern.PatternSequence,
                            IsMatch = true,
                            MatchedIndex = idx1,
                            Strand = "strand1"
                        });
                    }

                    if (idx2 >= 0)
                    {
                        matches.Add(new DiseaseScanMatchDto
                        {
                            DiseaseId = disease.Id,
                            DiseaseName = disease.Name,
                            Description = disease.Description,
                            GeneName = pattern.GeneName,
                            PatternSequence = pattern.PatternSequence,
                            IsMatch = true,
                            MatchedIndex = idx2,
                            Strand = "strand2"
                        });
                    }
                }

                if (matches.Count > 0)
                {
                    var total = disease.MutationPatterns.Count;
                    var matched = matches.Count;

                    results.Add(new DiseaseScanResultDto
                    {
                        DiseaseId = disease.Id,
                        DiseaseName = disease.Name,
                        Description = disease.Description,
                        MatchedPatterns = matched,
                        TotalPatterns = total,
                        Confidence = total == 0 ? 0 : (double)matched / total,
                        Matches = matches
                    });
                }
            }

            return results;
        }
    }
}

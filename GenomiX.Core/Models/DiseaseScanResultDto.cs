using GenomiX.Core.Models;

namespace GenomiX.ViewModels.Disease
{
    public class DiseaseScanResultDto
    {
        public Guid DiseaseId { get; set; }
        public string DiseaseName { get; set; } = "";
        public string Description { get; set; } = "";

        public int MatchedPatterns { get; set; }
        public int TotalPatterns { get; set; }

        public double Confidence { get; set; }

        public List<DiseaseScanMatchDto> Matches { get; set; } = new();
    }
}

namespace GenomiX.Core.Models
{
    public class DiseaseScanMatchDto
    {
        public Guid DiseaseId { get; set; }
        public string DiseaseName { get; set; } = "";
        public string Description { get; set; } = "";

        public string GeneName { get; set; } = "";
        public string PatternSequence { get; set; } = "";

        public bool IsMatch { get; set; }

        public int MatchedIndex { get; set; } = -1;
        public string Strand { get; set; } = "";
    }
}

namespace GenomiX.ViewModels.Disease
{
    public class ExplainDiseaseScanInputModel
    {
        public string DiseaseName { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string GeneName { get; set; } = string.Empty;

        public int MatchedPatterns { get; set; }

        public int TotalPatterns { get; set; }

        public double Confidence { get; set; }
    }
}

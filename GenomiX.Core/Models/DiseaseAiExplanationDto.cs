namespace GenomiX.Core.Models
{
    public class DiseaseAiExplanationDto
    {
        public string Title { get; set; } = string.Empty;

        public string Summary { get; set; } = string.Empty;

        public string BiologyExplanation { get; set; } = string.Empty;

        public List<string> LifestyleConsiderations { get; set; } = new();

        public List<string> MedicationConsiderations { get; set; } = new();

        public string Warning { get; set; } = string.Empty;
    }
}

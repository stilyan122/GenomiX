namespace GenomiX.Core.Models
{
    public class DiseaseAiExplanationDto
    {
        public string Title { get; set; } = string.Empty;

        public string ShortSummary { get; set; } = string.Empty;

        public string BiologicalMechanism { get; set; } = string.Empty;

        public List<DiseaseMechanismStepDto> MechanismSteps { get; set; } = new();

        public List<string> AffectedSystems { get; set; } = new();

        public string WhyThisMatters { get; set; } = string.Empty;

        public List<string> PossibleSymptoms { get; set; } = new();

        public List<string> FoodAndLifestyleConsiderations { get; set; } = new();

        public List<string> MedicationConsiderations { get; set; } = new();

        public List<string> HelpfulMonitoringIdeas { get; set; } = new();

        public string EducationalNotice { get; set; } = string.Empty;

        public List<DiseaseVisualMechanismStepDto> VisualMechanism { get; set; } = new();
        public string VisualTheme { get; set; } = string.Empty;
    }
}

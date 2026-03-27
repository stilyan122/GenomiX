namespace GenomiX.Core.Models
{
    public class DiseaseAiExplanationDto
    {
        public string Title { get; set; } = string.Empty;
        public string ShortSummary { get; set; } = string.Empty;

        public List<string> AffectedSystems { get; set; } = new();
        public List<string> PossibleSymptoms { get; set; } = new();

        public List<string> FoodPriorities { get; set; } = new();
        public List<string> MedicinesToDiscussWithDoctor { get; set; } = new();
        public List<string> HelpfulMonitoringIdeas { get; set; } = new();

        public string EducationalNotice { get; set; } = string.Empty;

        public List<DiseaseVisualStepDto> VisualSteps { get; set; } = new();
    }
}

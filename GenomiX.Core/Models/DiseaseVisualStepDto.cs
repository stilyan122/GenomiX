namespace GenomiX.Core.Models
{
    public class DiseaseVisualStepDto
    {
        public string Kind { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public string FromLabel { get; set; } = string.Empty;
        public string ToLabel { get; set; } = string.Empty;

        public List<string> Tags { get; set; } = new();
    }
}

namespace GenomiX.ViewModels.Admin
{
    public class AdminReferenceSequenceListItemViewModel
    {
        public Guid Id { get; set; }
        public string Species { get; set; } = "";
        public string Name { get; set; } = "";
        public int Length { get; set; }
        public string CreatedAt { get; set; } = "";

        public string CreatedBy { get; set; } = "Unknown";
    }
}

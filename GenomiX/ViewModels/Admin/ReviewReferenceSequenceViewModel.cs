namespace GenomiX.ViewModels.Admin
{
    public class ReviewReferenceSequenceViewModel
    {
        public Guid Id { get; set; }
        public string Species { get; set; } = "";
        public string Name { get; set; } = "";
        public string Sequence { get; set; } = "";
        public int Length { get; set; }
        public string CreatedAt { get; set; } = "";
        public bool IsApproved { get; set; }
        public bool IsRejected { get; set; }
        public string? RejectionReason { get; set; }

        public string CreatedBy { get; set; } = "Unknown";
    }
}

namespace GenomiX.ViewModels.Sequence
{
    public class SequenceViewModel
    {
        public Guid Id { get; set; }
        
        public string Sequence { get; set; } = "";

        public string Species { get; set; } = "";

        public string CreatedBy { get; set; } = "-";
    }
}

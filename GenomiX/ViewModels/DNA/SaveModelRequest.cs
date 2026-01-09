namespace GenomiX.ViewModels.DNA
{
    public class SaveModelRequest
    {
        public Guid ModelId { get; set; }
        public string Strand1 { get; set; } = "";
        public string Strand2 { get; set; } = "";
    }
}
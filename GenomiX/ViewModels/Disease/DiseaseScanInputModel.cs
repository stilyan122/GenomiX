namespace GenomiX.ViewModels.Disease
{
    public class DiseaseScanInputModel
    {
        public Guid ModelId { get; set; }

        public string Strand1 { get; set; } = string.Empty;

        public string Strand2 { get; set; } = string.Empty;
    }
}

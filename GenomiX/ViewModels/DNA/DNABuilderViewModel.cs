namespace GenomiX.ViewModels.DNA
{
    public class DNABuilderViewModel
    {
        public Guid ModelId { get; set; }

        public string Strand1 { get; set; } = "";

        public string Strand2 { get; set; } = "";

        public string Name { get; set; }

        public int Length => Strand1?.Length ?? 0;

        public bool HasBothStrands =>
            !string.IsNullOrWhiteSpace(Strand1) &&
            !string.IsNullOrWhiteSpace(Strand2) &&
            Strand1.Length == Strand2.Length;
    }
}

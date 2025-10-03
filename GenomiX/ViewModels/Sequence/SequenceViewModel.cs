namespace GenomiX.ViewModels.Sequence
{
    public class SequenceViewModel
    {
        /// <summary> Primary key (GUID). </summary>
        public Guid Id { get; set; }
        
        /// <summary> Raw DNA string. Uppercase A, C, G, T only (e.g., \"ATGCGT\"). </summary>
        public string Sequence { get; set; } = "";

        /// <summary> Species or organism identifier (examples: Human, Mouse, Dog). </summary>
        public string Species { get; set; } = "";
    }
}

namespace GenomiX.ViewModels.Sequence
{
    public class SequenceViewModel
    {
        /// <summary> Raw DNA string. Uppercase A, C, G, T only (e.g., \"ATGCGT\"). </summary>
        public string Sequence { get; set; } = "";
    }
}

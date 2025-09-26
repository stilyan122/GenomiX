using GenomiX.ViewModels.Sequence;

namespace GenomiX.ViewModels.DNA
{
    public class DNAModelViewModel
    {
        /// <summary> All strand snapshots owned by this model (two rows per PairIndex). </summary>
        public List<SequenceViewModel> Sequences { get; set; } = 
            new List<SequenceViewModel>();
    }
}

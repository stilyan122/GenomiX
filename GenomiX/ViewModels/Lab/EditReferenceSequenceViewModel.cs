using System.ComponentModel.DataAnnotations;

namespace GenomiX.ViewModels.Lab
{
    public class EditReferenceSequenceViewModel
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Species { get; set; } = "";

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = "";

        [Required]
        public string Sequence { get; set; } = "";
    }
}

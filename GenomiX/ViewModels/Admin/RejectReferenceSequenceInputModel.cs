using System.ComponentModel.DataAnnotations;

namespace GenomiX.ViewModels.Admin
{
    public class RejectReferenceSequenceInputModel
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(400)]
        public string Reason { get; set; } = "";
    }
}

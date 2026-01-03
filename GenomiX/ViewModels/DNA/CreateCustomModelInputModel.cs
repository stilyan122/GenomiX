using System.ComponentModel.DataAnnotations;

namespace GenomiX.ViewModels.DNA
{
    public class CreateCustomModelInputModel
    {
        [Required]
        [MaxLength(200000)]
        public string RawInput { get; set; } = "";

        [Required]
        [MaxLength(80)]
        public string Name { get; set; } = "";
    }
}

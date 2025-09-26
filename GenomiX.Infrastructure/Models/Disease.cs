using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Catalog of known diseases. </summary>
    [Comment("Catalog of known diseases.")]
    public class Disease
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Disease name. </summary>
        [Comment("Disease name.")]
        [Required]
        [MaxLength(Constants.DiseasePropertyConstraints.Name_MaxLength)]
        public string Name { get; set; } = "";

        /// <summary> Optional description or summary. </summary>
        [Comment("Optional description or summary.")]
        [MaxLength(Constants.DiseasePropertyConstraints.Description_MaxLength)]
        public string Description { get; set; } = "";

        /// <summary> Navigation Property for mapping table. </summary>
        public ICollection<DNAModelDisease> DNAModelDiseases { get; set; } = new List<DNAModelDisease>();
    }
}

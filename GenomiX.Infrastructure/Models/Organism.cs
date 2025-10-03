using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary>  Organism class with predefined organism to choose from. </summary>
    public class Organism
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> Simple/UI name. </summary>
        [Comment("Simple/UI name.")]
        [Required]
        [MaxLength(OrganismPropertyConstraints.SimpleName_MaxLength)]
        public string SimpleName { get; set; } = "";

        /// <summary> Scientific-like identifier. </summary>
        [Comment("Scientific-like identifier.")]
        [Required]
        [MaxLength(OrganismPropertyConstraints.ScientificName_MaxLength)]
        public string ScientificName { get; set; } = "";

        /// <summary> FK to a DNA strand snapshot (for this organism). </summary>
        [Comment("FK to a DNA strand snapshot (for this organism).")]
        [ForeignKey(nameof(DNASequence))]
        public Guid? DNA_Sequence_Id { get; set; }

        /// <summary> Optional description. </summary>
        [Comment("Optional description.")]
        [MaxLength(OrganismPropertyConstraints.Description_MaxLength)]
        public string Description { get; set; } = "";

        /// <summary> FK to Population. </summary>
        [Comment("FK to Population.")]
        [ForeignKey(nameof(Population))]
        public Guid? PopulationId { get; set; }

        /// <summary> Continuous survival/fitness score (nullable). </summary>
        [Comment("Continuous survival/fitness score (nullable).")]
        public double? SurvivalScore { get; set; }

        /// <summary> Status: alive | dead | reproduced. </summary>
        [Comment("Status: alive | dead | reproduced.")]
        [Required]
        [MaxLength(OrganismPropertyConstraints.Status_MaxLength)]
        public string Status { get; set; } = "";

        /// <summary> UTC created timestamp. </summary>
        [Comment("UTC created timestamp.")]
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary> DNA Sequence foreign key navigation property. </summary>
        public DNASequence? DNASequence { get; set; }

        /// <summary> Population navigation property. </summary>
        public Population? Population { get; set; }
    }
}

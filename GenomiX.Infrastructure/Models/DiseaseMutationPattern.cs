using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Stored mutation/signature pattern associated with a disease. </summary>
    [Comment("Mutation/signature pattern associated with a disease.")]
    public class DiseaseMutationPattern
    {
        /// <summary> Primary key (GUID). </summary>
        [Key]
        [Comment("Primary key (GUID).")]
        public Guid Id { get; set; }

        /// <summary> FK to Disease. </summary>
        [Required]
        [Comment("FK to Disease.")]
        [ForeignKey(nameof(Disease))]
        public Guid DiseaseId { get; set; }

        /// <summary> Disease navigation property. </summary>
        public Disease Disease { get; set; } = null!;

        /// <summary> Human-readable gene/marker name. </summary>
        [MaxLength(100)]
        [Comment("Gene or marker name.")]
        public string GeneName { get; set; } = "";

        /// <summary> Sequence fragment to search for. </summary>
        [Required]
        [MaxLength(500)]
        [Comment("DNA sequence fragment used for matching.")]
        public string PatternSequence { get; set; } = "";

        /// <summary> Match strategy: Exact / Contains / Similarity. </summary>
        [Required]
        [MaxLength(30)]
        [Comment("Match strategy.")]
        public string MatchType { get; set; } = "Exact";

        /// <summary> Optional start index if the pattern is position-specific. </summary>
        [Comment("Optional expected start index.")]
        public int? StartIndex { get; set; }

        /// <summary> Optional allowed mismatch count for similarity-based matching. </summary>
        [Comment("Allowed mismatch count.")]
        public int AllowedMismatchCount { get; set; } = 0;

        /// <summary> Optional short explanation for this marker. </summary>
        [MaxLength(1000)]
        [Comment("Optional explanation for this mutation marker.")]
        public string Notes { get; set; } = "";
    }
}

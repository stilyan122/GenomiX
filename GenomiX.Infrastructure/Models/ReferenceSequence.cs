using GenomiX.Infrastructure.Validation;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    [Comment("Reference DNA sequence template submission/approved item.")]
    public class ReferenceSequence
    {
        [Key]
        [Comment("Primary key (GUID).")]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Comment("Species/organism label (e.g., Human, Mouse).")]
        public string Species { get; set; } = "";

        [Required]
        [MaxLength(200)]
        [Comment("Human-friendly name (e.g., Beta-globin fragment).")]
        public string Name { get; set; } = "";

        [Required]
        [MaxLength(Constants.DNASequencePropertyConstraints.Sequence_MaxLength)]
        [AllowedDnaSequence]
        [Comment("Raw uppercase DNA string (A,C,G,T only).")]
        public string Sequence { get; set; } = "";

        [Required]
        [Comment("Creator user id (Scientist who submitted it).")]
        [ForeignKey(nameof(CreatedByUser))]
        public Guid CreatedByUserId { get; set; } 

        [Comment("Navigation to creator (optional).")]
        public GenUser? CreatedByUser { get; set; }

        [Comment("Approved flag. If true -> visible to the whole app.")]
        public bool IsApproved { get; set; }

        [Comment("Rejected flag.")]
        public bool IsRejected { get; set; }

        [Comment("Optional rejection reason (shown to the scientist).")]
        public string? RejectionReason { get; set; }

        [Comment("When approved (UTC).")]
        public DateTimeOffset? ApprovedAt { get; set; }

        [Comment("When rejected (UTC).")]
        public DateTimeOffset? RejectedAt { get; set; }

        [Comment("When created (UTC).")]
        public DateTimeOffset CreatedAt { get; set; }

        [Comment("When edited while pending (UTC).")]
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
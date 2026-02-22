using GenomiX.Infrastructure.Constants;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary>
    /// Represents a user-initiated request to add or remove a role (e.g., Scientist),
    /// which must be reviewed by an Admin.
    /// </summary>
    public class RoleRequest
    {
        /// <summary> Primary key (int). </summary>
        [Key]
        public int Id { get; set; }

        /// <summary> Foreign key to the requesting user. </summary>
        [Required]
        public Guid UserId { get; set; }

        /// <summary> Navigation property to the requesting user. </summary>
        [ForeignKey(nameof(UserId))]
        public GenUser User { get; set; } = null!;

        /// <summary>
        /// The role being requested (e.g., Scientist).
        /// Store normalized role names to avoid casing issues.
        /// </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.RequestedRole_MaxLength)]
        public string RequestedRole { get; set; } = null!;

        /// <summary>
        /// Request type: Add / Remove.
        /// </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.Type_MaxLength)]
        public string RequestType { get; set; } = "Add";

        /// <summary>
        /// Request status: Pending / Approved / Declined.
        /// </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.Status_MaxLength)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Optional note written by the requester (why they want it).
        /// This is user-facing input.
        /// </summary>
        [MaxLength(RoleRequestPropertyConstraints.Note_MaxLength)]
        public string? Note { get; set; }

        /// <summary>
        /// Optional admin decision note (why approved/declined).
        /// This is admin-facing input.
        /// </summary>
        [MaxLength(RoleRequestPropertyConstraints.Note_MaxLength)]
        public string? DecisionNote { get; set; }

        /// <summary>
        /// UTC timestamp when the request was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the request was last updated (optional).
        /// Useful if you allow editing a pending request.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        /// <summary>
        /// UTC timestamp when the request was decided (approved/declined).
        /// Null means still pending.
        /// </summary>
        public DateTime? DecidedAt { get; set; }

        /// <summary>
        /// Admin user id who approved/declined the request (nullable).
        /// If you have exactly one admin, you can still keep this field,
        /// but you can also leave it null and just use DecidedAt + Status.
        /// </summary>
        public Guid? DecidedByUserId { get; set; }

        /// <summary> Navigation property to the admin who decided (nullable). </summary>
        [ForeignKey(nameof(DecidedByUserId))]
        public GenUser? DecidedByUser { get; set; }

        /// <summary>
        /// True when Status != Pending (derived convenience).
        /// Not mapped; used for UI and clean checks.
        /// </summary>
        [NotMapped]
        public bool IsDecided => !string.Equals(Status, "Pending", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// True when Status == Approved (derived convenience).
        /// Not mapped.
        /// </summary>
        [NotMapped]
        public bool IsApproved => string.Equals(Status, "Approved", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// True when Status == Declined (derived convenience).
        /// Not mapped.
        /// </summary>
        [NotMapped]
        public bool IsDeclined => string.Equals(Status, "Declined", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// A soft-cancel mechanism.
        /// If we want "Cancel" to keep history instead of deleting the row,
        /// we set CancelledAt instead of removing from DB.
        /// </summary>
        public DateTime? CancelledAt { get; set; }

        /// <summary>
        /// Token/group key to help you deduplicate requests easily.
        /// Example: $"{UserId}:{RequestType}:{RequestedRole}". Not required, but helpful.
        /// </summary>
        [MaxLength(RoleRequestPropertyConstraints.DedupeKey_MaxLength)]
        public string? DedupeKey { get; set; }
    }
}
using GenomiX.Infrastructure.Constants;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GenomiX.Infrastructure.Models
{
    /// <summary>
    /// Represents a user-initiated request for an additional role (like Teacher / Scientist),
    /// which must be approved or declined by an Admin.
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

        /// <summary> The role being requested (Teacher / Scientist / etc.). </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.RequestedRole_MaxLength)]
        public string RequestedRole { get; set; } = null!;

        /// <summary>
        /// Request status: Pending / Approved / Declined.
        /// </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.Status_MaxLength)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Optional note from the requester (or admin comment depending on your UX).
        /// </summary>
        [MaxLength(RoleRequestPropertyConstraints.Note_MaxLength)]
        public string? Note { get; set; }

        /// <summary>
        /// Request type: Add / Remove.
        /// </summary>
        [Required]
        [MaxLength(RoleRequestPropertyConstraints.Type_MaxLength)]
        public string RequestType { get; set; } = "Add";

        /// <summary> UTC timestamp when the request was created. </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary> UTC timestamp when the request was decided (approved/declined). </summary>
        public DateTime? DecidedAt { get; set; }

        /// <summary> Admin user id who approved/declined the request (nullable). </summary>
        public Guid? DecidedByUserId { get; set; }

        /// <summary> Navigation property to the admin who decided (nullable). </summary>
        [ForeignKey(nameof(DecidedByUserId))]
        public GenUser? DecidedByUser { get; set; }
    }
}

using GenomiX.Infrastructure.Constants;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace GenomiX.Infrastructure.Models
{
    /// <summary> Test/quiz question associated with a Lesson. </summary>
    [Comment("Test/quiz question associated with a Lesson.")]
    public class Test
    {
        /// <summary> Primary key (GUID). </summary>
        [Comment("Primary key (GUID).")]
        [Key]
        public Guid Id { get; set; }

        /// <summary> FK to Lesson. </summary>
        [Comment("FK to Lesson.")]
        public Guid LessonId { get; set; }

        /// <summary> The title text. </summary>
        [Comment("The title text.")]
        [Required]
        [MaxLength(TestPropertyConstraints.Title_MaxLength)]
        public string Title { get; set; } = "";

        /// <summary> Navigation property for questions table. </summary>
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}

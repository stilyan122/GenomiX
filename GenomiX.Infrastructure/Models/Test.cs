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

        /// <summary> Question type: mcq | multi | open. </summary>
        [Comment("Question type: mcq | multi | open.")]
        [Required]
        [MaxLength(TestPropertyConstraints.Type_MaxLength)]
        public string Type { get; set; } = "";

        /// <summary> The question text/prompt. </summary>
        [Comment("The question text/prompt.")]
        [Required]
        [MaxLength(TestPropertyConstraints.Question_MaxLength)]
        public string Question { get; set; } = "";

        /// <summary> Navigation property for questions table. </summary>
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}

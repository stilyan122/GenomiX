namespace GenomiX.ViewModels.DNA
{
    public class DNAModelListViewModel
    {
        public Guid Id { get; set; }
        public int Length { get; set; }

        public string Name { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}

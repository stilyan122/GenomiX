namespace GenomiX.ViewModels.Population
{
    public class CreatePopulationViewModel : CreatePopulationInputModel
    {
        public List<ModelOption> Models { get; set; } = new();

        public class ModelOption
        {
            public Guid Id { get; set; }
            public string Name { get; set; } = "";
            public int Length { get; set; }
        }
    }
}

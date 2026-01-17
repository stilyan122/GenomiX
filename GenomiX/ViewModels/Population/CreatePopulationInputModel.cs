namespace GenomiX.ViewModels.Population
{
    public class CreatePopulationInputModel
    {
        public string Name { get; set; } = "";
        public Guid BaseModelId { get; set; }
        public int Size { get; set; } = 200;

        public double Temperature { get; set; } = 22;
        public double Radiation { get; set; } = 0.1;
        public double DiseasePressure { get; set; } = 0.1;
        public double Resources { get; set; } = 0.7;
    }
}

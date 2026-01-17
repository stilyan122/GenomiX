namespace GenomiX.ViewModels.Simulation
{
    public class UpdateFactorsRequest
    {
        public double Temperature { get; set; }
        public double Radiation { get; set; }
        public double DiseasePressure { get; set; }
        public double Resources { get; set; }
        public int Speed { get; set; } = 1;
    }
}

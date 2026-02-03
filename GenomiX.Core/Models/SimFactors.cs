namespace GenomiX.Core.Models
{
    public class SimFactors
    {
        public double Temperature { get; set; } = 22;
        public double Radiation { get; set; } = 0.1;        
        public double DiseasePressure { get; set; } = 0.1;  
        public double Resources { get; set; } = 0.7;        
        public int Tick { get; set; } = 0;
        public bool IsRunning { get; set; } = false;
        public int Speed { get; set; } = 1;

        public string Species { get; set; } = "mouse";
    }
}

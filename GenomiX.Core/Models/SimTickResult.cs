namespace GenomiX.Core.Models
{
    public class SimTickResult
    {
        public int Tick { get; set; }
        public int Alive { get; set; }
        public int Dead { get; set; }
        public int Reproduced { get; set; }
        public double AvgFitness { get; set; }
    }
}

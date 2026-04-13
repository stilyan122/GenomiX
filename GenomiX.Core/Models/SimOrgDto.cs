namespace GenomiX.Core.Models
{
    public class SimOrgDto
    {
        public Guid Id { get; set; }
        public string Status { get; set; } = "alive";
        public double Fitness { get; set; }
        public float X { get; set; }
        public float Y { get; set; }
        public string Name { get; set; } = "";
        public string Species { get; set; } = "";
    }
}
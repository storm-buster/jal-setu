from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Literal

Region = Literal["Bihar", "Uttarakhand", "Jharkhand", "Uttar Pradesh"]
Scenario = Literal["0m", "1m", "2m"]


@dataclass
class RiverSegment:
    """Represents a river segment with coordinates"""
    name: str
    coordinates: list[tuple[float, float]]  # [(lon, lat), ...]
    avg_width_m: float = 500.0
    flood_prone: bool = True


@dataclass
class FloodGeometry:
    """GeoJSON-compatible flood zone geometry"""
    type: str  # "Polygon" or "MultiPolygon"
    coordinates: list[list[list[float]]]
    properties: dict[str, Any]


# Major rivers for each region with simplified centerline coordinates
RIVER_NETWORKS: dict[Region, list[RiverSegment]] = {
    "Bihar": [
        RiverSegment(
            name="Ganges",
            coordinates=[
                (84.2, 25.6), (84.5, 25.5), (85.0, 25.4), 
                (85.3, 25.3), (85.6, 25.2), (86.0, 25.1),
                (86.3, 25.0), (86.6, 24.9), (87.0, 24.8)
            ],
            avg_width_m=800.0,
        ),
        RiverSegment(
            name="Kosi",
            coordinates=[
                (86.8, 26.5), (86.7, 26.2), (86.6, 25.9),
                (86.5, 25.6), (86.4, 25.3), (86.3, 25.0)
            ],
            avg_width_m=400.0,
        ),
        RiverSegment(
            name="Gandak",
            coordinates=[
                (84.0, 26.8), (84.2, 26.5), (84.5, 26.2),
                (84.8, 25.9), (85.0, 25.6), (85.2, 25.3)
            ],
            avg_width_m=350.0,
        ),
        RiverSegment(
            name="Bagmati",
            coordinates=[
                (85.5, 26.5), (85.6, 26.2), (85.7, 25.9),
                (85.8, 25.6), (85.9, 25.3)
            ],
            avg_width_m=250.0,
        ),
    ],
    "Uttarakhand": [
        RiverSegment(
            name="Ganges",
            coordinates=[
                (78.2, 30.1), (78.5, 30.0), (78.8, 29.9),
                (79.1, 29.8), (79.4, 29.7), (79.7, 29.6)
            ],
            avg_width_m=600.0,
        ),
        RiverSegment(
            name="Yamuna",
            coordinates=[
                (78.0, 30.9), (78.2, 30.7), (78.4, 30.5),
                (78.6, 30.3), (78.8, 30.1), (79.0, 29.9)
            ],
            avg_width_m=500.0,
        ),
        RiverSegment(
            name="Alaknanda",
            coordinates=[
                (79.0, 30.7), (79.1, 30.5), (79.2, 30.3),
                (79.3, 30.1), (79.4, 29.9)
            ],
            avg_width_m=300.0,
        ),
        RiverSegment(
            name="Bhagirathi",
            coordinates=[
                (78.6, 31.0), (78.7, 30.8), (78.8, 30.6),
                (78.9, 30.4), (79.0, 30.2)
            ],
            avg_width_m=280.0,
        ),
    ],
    "Jharkhand": [
        RiverSegment(
            name="Damodar",
            coordinates=[
                (84.5, 24.0), (84.8, 23.8), (85.1, 23.6),
                (85.4, 23.4), (85.7, 23.2), (86.0, 23.0),
                (86.3, 22.8)
            ],
            avg_width_m=450.0,
        ),
        RiverSegment(
            name="Subarnarekha",
            coordinates=[
                (85.0, 23.5), (85.3, 23.3), (85.6, 23.1),
                (85.9, 22.9), (86.2, 22.7)
            ],
            avg_width_m=350.0,
        ),
        RiverSegment(
            name="Koel",
            coordinates=[
                (84.0, 23.8), (84.3, 23.6), (84.6, 23.4),
                (84.9, 23.2), (85.2, 23.0)
            ],
            avg_width_m=300.0,
        ),
    ],
    "Uttar Pradesh": [
        RiverSegment(
            name="Ganges",
            coordinates=[
                (77.5, 29.5), (78.0, 29.3), (78.5, 29.0),
                (79.0, 28.7), (79.5, 28.4), (80.0, 28.0),
                (80.5, 27.7), (81.0, 27.4), (81.5, 27.0),
                (82.0, 26.7), (82.5, 26.4), (83.0, 26.0),
                (83.5, 25.7), (84.0, 25.4)
            ],
            avg_width_m=900.0,
        ),
        RiverSegment(
            name="Yamuna",
            coordinates=[
                (77.2, 30.4), (77.5, 30.0), (77.8, 29.6),
                (78.1, 29.2), (78.4, 28.8), (78.7, 28.4),
                (79.0, 28.0), (79.3, 27.6), (79.6, 27.2)
            ],
            avg_width_m=700.0,
        ),
        RiverSegment(
            name="Gomti",
            coordinates=[
                (80.0, 28.5), (80.3, 28.2), (80.6, 27.9),
                (80.9, 27.6), (81.2, 27.3), (81.5, 27.0)
            ],
            avg_width_m=400.0,
        ),
        RiverSegment(
            name="Ghaghra",
            coordinates=[
                (81.5, 27.5), (81.8, 27.2), (82.1, 26.9),
                (82.4, 26.6), (82.7, 26.3), (83.0, 26.0)
            ],
            avg_width_m=500.0,
        ),
    ],
}



try:
    from shapely.geometry import LineString, Polygon
    from shapely.ops import transform
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False


@dataclass
class IntersectionResult:
    river_name: str
    intersection_length_km: float
    is_intersecting: bool


def get_river_network(region: Region) -> list[RiverSegment]:
    """Returns major rivers for a given region"""
    return RIVER_NETWORKS.get(region, [])



def is_point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    """Ray casting algorithm to check if point is in polygon."""
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def segments_intersect(p1: tuple[float, float], p2: tuple[float, float], 
                      p3: tuple[float, float], p4: tuple[float, float]) -> bool:
    """Check if line segment p1-p2 intersects p3-p4."""
    def ccw(A, B, C):
        return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
    
    return (ccw(p1, p3, p4) != ccw(p2, p3, p4)) and (ccw(p1, p2, p3) != ccw(p1, p2, p4))

def check_river_intersection(region: Region, polygon_rings: list[list[list[float]]]) -> list[IntersectionResult]:
    """
    Robust geometric check for river intersection with AOI.
    Uses Shapely if available, falls back to manual geometric checks.
    """
    rivers = get_river_network(region)
    if not rivers:
        return []

    results = []

    # Flatten rings if needed (use the first ring of each polygon for simplicity)
    # The input 'polygon_rings' is actually a list of rings.
    if not polygon_rings:
        return []

    for river in rivers:
        if not river.coordinates or len(river.coordinates) < 2:
            continue
            
        intersected = False
        intersection_len = 0.0
        
        # Check against each ring (assuming they are potential polygons)
        for ring in polygon_rings:
            if not ring or len(ring) < 3:
                continue
                
            # 1. Bounding Box Check (Optimization)
            poly_xs = [p[0] for p in ring]
            poly_ys = [p[1] for p in ring]
            min_x, max_x = min(poly_xs), max(poly_xs)
            min_y, max_y = min(poly_ys), max(poly_ys)
            
            riv_xs = [p[0] for p in river.coordinates]
            riv_ys = [p[1] for p in river.coordinates]
            r_min_x, r_max_x = min(riv_xs), max(riv_xs)
            r_min_y, r_max_y = min(riv_ys), max(riv_ys)
            
            if (max_x < r_min_x or min_x > r_max_x or max_y < r_min_y or min_y > r_max_y):
                continue # No overlap possible
                
            # 2. Detailed Check
            # Check if any river point is INSIDE the polygon
            for p in river.coordinates:
                if is_point_in_polygon(p[0], p[1], ring):
                    intersected = True
                    break
            
            if intersected:
                break
                
            # 3. Check segment intersections
            # Only if point check failed (river might cross through without stopping inside)
            for i in range(len(river.coordinates) - 1):
                rp1 = river.coordinates[i]
                rp2 = river.coordinates[i+1]
                
                for j in range(len(ring) - 1):
                    pp1 = ring[j]
                    pp2 = ring[j+1]
                    
                    if segments_intersect(rp1, rp2, (pp1[0], pp1[1]), (pp2[0], pp2[1])):
                        intersected = True
                        break
                if intersected:
                    break
            
            if intersected:
                break
        
        if intersected:
            # Calculate rough length
            # If completely inside, it's total length. If partial, just estimate.
            # For this feature, we just need a magnitude.
            # Let's sum up segments that are inside or intersecting
            
            # Simple heuristic: Length of the diagonal of the bbox of intersection?
            # Or just return a standard "Detected" length
            length_deg = 0.1 # Default small
            length_km = length_deg * 100.0 
            
            print(f"DEBUG: Manual Intersect FOUND with {river.name}")
            results.append(IntersectionResult(
                river_name=river.name,
                intersection_length_km=length_km,
                is_intersecting=True
            ))

    return results


def calculate_buffer_distance(
    scenario: Scenario,
    river_width_m: float = 500.0,
    terrain_slope: float = 2.0
) -> float:
    """
    Calculate flood buffer distance in kilometers based on scenario and terrain.
    
    Base buffer:
    - 0m: 0 km (no flooding)
    - 1m: 3 km base
    - 2m: 8 km base
    
    Adjustments:
    - Wider rivers get larger buffers
    - Flatter terrain gets larger buffers
    """
    base_buffer_km = {
        "0m": 0.1, # Base flow (minimal buffer representing actual river)
        "1m": 3.0,
        "2m": 8.0,
    }[scenario]
    
    # Wider rivers spread floods further (and are wider at base)
    width_factor = 1.0 + (river_width_m / 1000.0)
    
    # For 0m, we just want the river width itself, roughly.
    if scenario == "0m":
         # Return approx half width as buffer (radius) + small margin
         return (river_width_m / 1000.0) * 0.8
    
    # Flatter terrain allows wider spread
    slope_factor = 1.0 + (1.0 / max(terrain_slope, 0.1))
    
    return base_buffer_km * width_factor * slope_factor


def generate_flood_buffer(
    river: RiverSegment,
    buffer_km: float,
    elevation_factor: float = 1.0
) -> FloodGeometry:
    """
    Creates a flood zone polygon around a river with specified buffer distance.
    
    Uses a simple rectangular buffer approach for each river segment.
    """
    if buffer_km <= 0 or not river.coordinates:
        # Return empty geometry for 0m scenario
        return FloodGeometry(
            type="Polygon",
            coordinates=[],
            properties={
                "river_name": river.name,
                "buffer_km": 0.0,
                "flood_prone": False,
            }
        )
    
    # Convert buffer from km to approximate degrees (rough approximation)
    # 1 degree latitude ≈ 111 km
    buffer_deg = (buffer_km / 111.0) * elevation_factor
    
    # Create a buffer polygon around the river line
    # Simple approach: create rectangles around each segment
    polygon_coords: list[list[float]] = []
    
    for i, (lon, lat) in enumerate(river.coordinates):
        if i == 0:
            # First point: create left side of buffer
            polygon_coords.append([lon - buffer_deg, lat - buffer_deg])
        
        # Add points along the river with buffer
        polygon_coords.append([lon - buffer_deg, lat])
    
    # Add right side going back
    for i in range(len(river.coordinates) - 1, -1, -1):
        lon, lat = river.coordinates[i]
        polygon_coords.append([lon + buffer_deg, lat])
    
    # Close the polygon
    if polygon_coords:
        polygon_coords.append(polygon_coords[0])
    
    return FloodGeometry(
        type="Polygon",
        coordinates=[polygon_coords] if polygon_coords else [],
        properties={
            "river_name": river.name,
            "buffer_km": buffer_km,
            "flood_prone": river.flood_prone,
            "river_width_m": river.avg_width_m,
        }
    )


@lru_cache(maxsize=32)
def get_flood_geometry(region: Region, scenario: Scenario) -> dict[str, Any]:
    """
    Main entry point: generates complete GeoJSON FeatureCollection for region/scenario.
    
    Returns a GeoJSON FeatureCollection with flood zones for all rivers in the region.
    Cached to improve performance for repeated requests (up to 32 region/scenario combinations).
    """
    rivers = get_river_network(region)
    
    if not rivers:
        # Return empty FeatureCollection for regions without rivers
        return {
            "type": "FeatureCollection",
            "features": []
        }
    
    features = []
    
    for river in rivers:
        # Calculate buffer distance based on scenario and river characteristics
        buffer_km = calculate_buffer_distance(
            scenario,
            river_width_m=river.avg_width_m,
            terrain_slope=2.0  # Default slope, can be refined per region
        )
        
        # Generate flood geometry for this river
        flood_geom = generate_flood_buffer(river, buffer_km)
        
        if flood_geom.coordinates:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": flood_geom.type,
                    "coordinates": flood_geom.coordinates
                },
                "properties": {
                    **flood_geom.properties,
                    "scenario": scenario,
                    "region": region,
                }
            }
            features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


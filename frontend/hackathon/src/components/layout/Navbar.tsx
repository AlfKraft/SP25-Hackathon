import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuContent,
  } from "@/components/ui/navigation-menu"
import { Link } from "react-router-dom"
import { useHackathon } from "@/contexts/HackathonContext"
import { getStatusDisplayInfo } from "@/types/hackathon"
import { RefreshCw, Plus } from "lucide-react"

export default function Navbar() {
  const { hackathons, currentHackathon, setCurrentHackathon, isLoading, refreshHackathons } = useHackathon();

  return (
    <NavigationMenu className="container mx-auto px-4 py-6">
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="gap-2">
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : currentHackathon ? (
              currentHackathon.name
            ) : (
              'Select Hackathon'
            )}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid gap-2 p-4 w-[420px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : hackathons.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No hackathons found</p>
                  <button 
                    onClick={() => refreshHackathons()}
                    className="text-sm text-blue-600 hover:underline mt-2"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {hackathons.map((hackathon) => (
                    <NavigationMenuLink
                      key={hackathon.id}
                      asChild
                      className={`block select-none rounded-lg p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer border ${
                        currentHackathon?.id === hackathon.id 
                          ? 'bg-accent/50 border-primary/30' 
                          : 'border-transparent'
                      }`}
                      onClick={() => setCurrentHackathon(hackathon)}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{hackathon.name}</span>
                          {hackathon.status && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusDisplayInfo(hackathon.status).className}`}>
                              {getStatusDisplayInfo(hackathon.status).label}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                          {hackathon.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{hackathon.participants.length} participants</span>
                          <span>{hackathon.location}</span>
                        </div>
                      </div>
                    </NavigationMenuLink>
                  ))}
                  
                  <div className="border-t pt-2 mt-1 inline-block">
                    <Link to="/create-hackathon" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Create New Hackathon</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
              <Link to="/">Home</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/participants">Participants</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link to="/team-builder">Team Builder</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
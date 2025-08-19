import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userParam = searchParams.get("user");
    const error = searchParams.get("error");
    const pendingApproval = searchParams.get("pendingApproval");

    if (error) {
      // Handle OAuth errors
      let errorMessage = "Authentication failed";
      switch (error) {
        case "oauth_failed":
          errorMessage = "Google authentication failed. Please try again.";
          break;
        case "pending_approval":
          errorMessage = "Your account is pending admin approval. Please wait for approval.";
          break;
        case "oauth_error":
          errorMessage = "An error occurred during authentication. Please try again.";
          break;
        default:
          errorMessage = "Authentication failed. Please try again.";
      }
      
      navigate("/login", { 
        state: { error: errorMessage },
        replace: true 
      });
      return;
    }

    // Handle pending approval case - redirect to profile completion for new users
    if (pendingApproval === 'true' && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Check if user needs to complete profile (missing location or phone)
        if (!user.location || !user.phone) {
          // Redirect to profile completion page
          navigate("/complete-profile", {
            state: { user },
            replace: true
          });
          return;
        } else {
          // Profile already complete, just show pending approval message
          const approvalMessage = `Welcome back ${user.name}! Your account is pending admin approval. You will receive access to your dashboard once approved.`;
          
          navigate("/", { 
            state: { 
              successMessage: approvalMessage,
              pendingApproval: true,
              userInfo: {
                name: user.name,
                email: user.email,
                role: user.role,
                location: user.location,
                phone: user.phone
              }
            },
            replace: true 
          });
          return;
        }
      } catch (err) {
        console.error("Error processing pending approval callback:", err);
        navigate("/", { 
          state: { 
            successMessage: "Your Google account has been successfully connected and is pending admin approval.",
            pendingApproval: true
          },
          replace: true 
        });
        return;
      }
    }

    if (token && userParam) {
      try {
        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store authentication data
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        
        // Update AuthContext
        setUser(user);
        
        // Navigate to appropriate dashboard
        navigate(`/${user.role}/dashboard`, { replace: true });
      } catch (err) {
        console.error("Error processing OAuth callback:", err);
        navigate("/login", { 
          state: { error: "Failed to process authentication. Please try again." },
          replace: true 
        });
      }
    } else {
      // Missing required parameters
      navigate("/login", { 
        state: { error: "Invalid authentication response. Please try again." },
        replace: true 
      });
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-green-700 mb-2">Completing Sign In...</h2>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}

export default AuthCallback;

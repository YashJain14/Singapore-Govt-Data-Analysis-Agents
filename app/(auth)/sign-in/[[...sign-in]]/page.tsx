import React from "react";
import { SignIn } from "@clerk/nextjs";
import { Lock } from "lucide-react";

const SignInPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full mb-4">
            <Lock className="text-blue-500" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 mt-1">Please sign in to your account</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
};

export default SignInPage;
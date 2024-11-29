
import React from "react";
import { SignUp } from "@clerk/nextjs";
import { UserPlus } from "lucide-react";

const SignUpPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-green-100 p-3 rounded-full mb-4">
            <UserPlus className="text-green-500" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create an Account</h1>
          <p className="text-gray-600 mt-1">Join us and get started today</p>
        </div>
        <SignUp />
      </div>
    </div>
  );
};

export default SignUpPage;
